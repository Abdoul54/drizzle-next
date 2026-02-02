import { db } from "@/db";
import { quizzes, conversations, attachments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { generateAttachmentKey, uploadFile } from "@/lib/storage";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { embed } from "ai";
import { openai } from "@ai-sdk/openai";
import { extractText } from "unpdf";
import mammoth from "mammoth";

export async function GET() {
    try {
        const allQuizzes = await db.select().from(quizzes);
        return NextResponse.json(allQuizzes);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch quizzes" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await request.formData();

        const title = formData.get("title") as string;
        const description = formData.get("description") as string;
        const category = formData.get("category") as string;
        const types = JSON.parse(formData.get("types") as string);

        const files = formData.getAll("files") as File[];

        const quizId = nanoid();
        const conversationId = nanoid();

        const uploadedFiles = await Promise.all(
            files.map(async (file) => {
                const key = generateAttachmentKey(conversationId, file.name);
                const buffer = Buffer.from(await file.arrayBuffer());
                const { url } = await uploadFile(key, buffer, file.type);

                const textContent = await extractTextFromBuffer(buffer, file.type);

                let embedding: number[] | null = null;

                if (textContent) {
                    const { embedding: embeddingResult } = await embed({
                        model: openai.embedding("text-embedding-3-small"),
                        value: textContent,
                    });
                    embedding = embeddingResult;
                }

                return {
                    id: nanoid(),
                    conversationId,
                    filename: file.name,
                    url,
                    mimeType: file.type,
                    size: file.size,
                    content: textContent,
                    embedding,
                };
            })
        );

        const result = await db.transaction(async (tx) => {
            const [newQuiz] = await tx
                .insert(quizzes)
                .values({
                    id: quizId,
                    title,
                    description,
                    category,
                    types,
                })
                .returning();

            const [newConversation] = await tx
                .insert(conversations)
                .values({
                    id: conversationId,
                    title,
                    userId: user.id,
                    quizId,
                })
                .returning();

            let newAttachments: typeof uploadedFiles = [];
            if (uploadedFiles.length > 0) {
                newAttachments = await tx
                    .insert(attachments)
                    .values(uploadedFiles)
                    .returning();
            }

            return {
                quiz: newQuiz,
                conversation: newConversation,
                attachments: newAttachments,
            };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Failed to create quiz:", error);
        return NextResponse.json(
            { error: "Failed to create quiz" },
            { status: 500 }
        );
    }
}

async function extractTextFromBuffer(buffer: Buffer, mimeType: string): Promise<string | null> {
    const textTypes = ["text/plain", "text/markdown", "text/csv"];

    if (textTypes.includes(mimeType)) {
        return buffer.toString("utf-8");
    }

    if (mimeType === "application/pdf") {
        const uint8 = new Uint8Array(buffer);
        const { text } = await extractText(uint8, { mergePages: true });
        return text;
    }

    if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
    ) {
        const { value } = await mammoth.extractRawText({ buffer });
        return value;
    }

    return null;
}