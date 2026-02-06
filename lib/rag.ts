import { embed, embedMany, cosineSimilarity } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/db';
import { attachment } from '@/db/schema';
import { and, eq, isNull, or } from 'drizzle-orm';

export type RagDocument = {
    id: number;
    title: string;
    content: string;
    scope: 'quiz' | 'conversation';
    updatedAt?: Date | null;
};

const embeddingModel = openai.embeddingModel(
    process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
);

const embeddingCache = new Map<string, number[]>();

function buildCacheKey(doc: RagDocument) {
    return `${doc.id}-${doc.updatedAt?.toISOString() ?? 'no-date'}`;
}

async function embedDocuments(documents: RagDocument[]): Promise<number[][]> {
    const embeddings: number[][] = new Array(documents.length);
    const missingDocs: RagDocument[] = [];
    const missingIndexes: number[] = [];

    documents.forEach((doc, index) => {
        const cached = embeddingCache.get(buildCacheKey(doc));
        if (cached) {
            embeddings[index] = cached;
            return;
        }
        missingDocs.push(doc);
        missingIndexes.push(index);
    });

    if (missingDocs.length > 0) {
        const { embeddings: newEmbeddings } = await embedMany({
            model: embeddingModel,
            values: missingDocs.map((doc) => doc.content),
        });

        newEmbeddings.forEach((embedding, idx) => {
            const doc = missingDocs[idx];
            embeddingCache.set(buildCacheKey(doc), embedding);
            embeddings[missingIndexes[idx]] = embedding;
        });
    }

    return embeddings;
}

async function fetchAttachmentDocuments({
    quizId,
    conversationId,
}: {
    quizId?: number;
    conversationId?: number | null;
}): Promise<RagDocument[]> {
    if (!quizId) {
        return [];
    }

    const rows = await db
        .select({
            id: attachment.id,
            filename: attachment.filename,
            content: attachment.content,
            conversationId: attachment.conversationId,
            updatedAt: attachment.updatedAt,
        })
        .from(attachment)
        .where(
            and(
                eq(attachment.quizId, quizId),
                conversationId
                    ? or(
                        eq(attachment.conversationId, conversationId),
                        isNull(attachment.conversationId)
                    )
                    : isNull(attachment.conversationId)
            )
        );

    return rows
        .filter((row) => row.content)
        .map((row) => ({
            id: row.id,
            title: row.filename ?? `Attachment ${row.id}`,
            content: row.content ?? '',
            scope: row.conversationId ? 'conversation' : 'quiz',
            updatedAt: row.updatedAt,
        }));
}

export async function buildRagContext({
    query,
    quizId,
    conversationId,
    limit = 6,
}: {
    query: string;
    quizId?: number;
    conversationId?: number | null;
    limit?: number;
}): Promise<{ context: string }> {
    if (!query.trim()) {
        return { context: 'No user query available.' };
    }

    const documents = await fetchAttachmentDocuments({
        quizId,
        conversationId,
    });

    if (documents.length === 0) {
        return { context: 'No attachment sources available.' };
    }

    const [docEmbeddings, { embedding: queryEmbedding }] = await Promise.all([
        embedDocuments(documents),
        embed({
            model: embeddingModel,
            value: query,
        }),
    ]);

    const ranked = documents
        .map((doc, index) => ({
            doc,
            score: cosineSimilarity(docEmbeddings[index], queryEmbedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(({ doc }) => doc);

    const context = ranked
        .map(
            (doc, index) =>
                `Source ${index + 1} (${doc.scope} attachment): ${doc.title}\n${doc.content}`
        )
        .join('\n\n');

    return { context };
}
