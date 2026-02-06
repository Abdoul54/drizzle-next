import { getCurrentUser } from "@/lib/auth-session";
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { buildRagContext } from '@/lib/rag';

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { messages, conversationId, quizId } = await req.json();

    const latestUserMessage = messages
        .slice()
        .reverse()
        .find((message: { role: string }) => message.role === "user");

    // Log the actual message structure
    console.log('📨 Latest user message structure:', {
        hasMessage: !!latestUserMessage,
        keys: latestUserMessage ? Object.keys(latestUserMessage) : [],
        hasParts: latestUserMessage?.parts ? true : false,
        hasContent: latestUserMessage?.content !== undefined,
        parts: latestUserMessage?.parts,
        content: latestUserMessage?.content,
    });

    // Extract query text - messages use parts array, not content field
    let queryText = "";

    if (latestUserMessage?.parts && Array.isArray(latestUserMessage.parts)) {
        // Extract text from parts array
        const textParts = latestUserMessage.parts
            .filter((part: any) => part.type === "text")
            .map((part: any) => part.text || part.content || "");
        queryText = textParts.join(" ").trim();
    } else if (typeof latestUserMessage?.content === "string") {
        // Fallback for old format
        queryText = latestUserMessage.content;
    } else if (latestUserMessage?.content) {
        queryText = JSON.stringify(latestUserMessage.content);
    }

    console.log('🔍 Query extraction:', {
        hasLatestMessage: !!latestUserMessage,
        hasParts: Array.isArray(latestUserMessage?.parts),
        partsCount: latestUserMessage?.parts?.length || 0,
        contentType: typeof latestUserMessage?.content,
        queryText: queryText.substring(0, 100),
        queryLength: queryText.length,
    });

    const parsedConversationId =
        typeof conversationId === 'number'
            ? conversationId
            : typeof conversationId === 'string'
                ? Number(conversationId)
                : null;

    const parsedQuizId =
        typeof quizId === 'number'
            ? quizId
            : typeof quizId === 'string'
                ? Number(quizId)
                : undefined;

    console.log('📊 IDs parsed:', {
        quizId: parsedQuizId,
        conversationId: parsedConversationId,
        hasQuizId: !!parsedQuizId,
        hasConversationId: !!parsedConversationId,
    });

    const { context: contextBlock } = queryText
        ? await buildRagContext({
            query: queryText,
            quizId: Number.isNaN(parsedQuizId ?? NaN)
                ? undefined
                : parsedQuizId,
            conversationId: Number.isNaN(parsedConversationId ?? NaN)
                ? null
                : parsedConversationId,
        })
        : { context: 'No user query available.' };

    // Debug logging
    console.log('📚 RAG Context Debug:', {
        quizId: parsedQuizId,
        conversationId: parsedConversationId,
        queryText: queryText.substring(0, 100) + '...',
        contextLength: contextBlock.length,
        hasContext: contextBlock !== 'No attachment sources available.' && contextBlock !== 'No user query available.',
        contextPreview: contextBlock.substring(0, 200) + '...',
    });

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        system: `You are a helpful quiz generator assistant.

Information:
- User's name is ${user?.name}
- User speaks English

## Context from Uploaded Documents:
${contextBlock}

## Instructions:
- When users ask about uploaded documents, PDFs, or files, USE THE CONTEXT ABOVE to answer their questions.
- The context contains text extracted from documents the user uploaded to this quiz.
- If the user asks "what's in the PDF?" or "what does the document say?", reference the specific information from the Context section.
- You can use the web_search tool for information NOT in the uploaded documents.
- Be specific when referencing document content - mention page numbers, sections, or key points from the context.
`,
        messages: await convertToModelMessages(messages),
        tools: {
            web_search: openai.tools.webSearch({
                externalWebAccess: true,
            })
        },
        onStepFinish: ({ toolCalls, toolResults }) => {
            console.log('Step finished:', { toolCalls, toolResults });
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onFinish: async ({ text, response }) => {
            console.log('✅ Response generated, context was:', contextBlock.length, 'chars');
        },
    });

    return result.toUIMessageStreamResponse();
}