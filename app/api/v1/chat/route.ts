// app/api/v1/chat/route.ts
import { getCurrentUser } from "@/lib/auth-session";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, generateId, stepCountIs } from "ai";
import { buildRagContext } from "@/lib/rag";
import { convertTextFilesToContent } from "@/lib/message-converter";
import {
    saveUserMessage,
    saveAssistantMessage,
    extractQueryText,
    parseId,
} from "@/lib/chat-persistence";
import { generateQuiz } from "@/lib/tools";


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
    const convId = parseId(conversationId);
    const qzId = parseId(quizId) ?? undefined;

    if (convId) {
        await saveUserMessage(messages, convId);
    }

    const processedMessages = await convertTextFilesToContent(messages);
    const queryText = extractQueryText(processedMessages);

    const { context: contextBlock } = queryText
        ? await buildRagContext({ query: queryText, quizId: qzId, conversationId: convId })
        : { context: "No user query available." };

    const assistantMessageId = generateId();

    try {
        const result = streamText({
            model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
            system: `You are a helpful quiz generator assistant.

Information:
- User's name is ${user?.name}
- User speaks English
- Quiz id is ${quizId}
- Conversation id is ${conversationId}

## Context from Uploaded Documents:
${contextBlock}

## Instructions:
- When users ask about uploaded documents, PDFs, or files, USE THE CONTEXT ABOVE to answer their questions.
- The context contains text extracted from documents the user uploaded to this quiz.
- If the user asks "what's in the PDF?" or "what does the document say?", reference the specific information from the Context section.
- Be specific when referencing document content - mention page numbers, sections, or key points from the context.
- When generating the quiz use the generateQuiz tool, and NEVER output quiz questions in assistant text.
`,
            messages: await convertToModelMessages(processedMessages),
            tools: {
                generateQuiz
            },
            stopWhen: stepCountIs(10),
            onError: async ({ error }) => {
                console.log(error)
            },
            onFinish: async ({ text, steps }) => {
                if (!convId) return;
                try {
                    await saveAssistantMessage({
                        id: assistantMessageId,
                        conversationId: convId,
                        text,
                        steps,
                    });
                } catch (error) {
                    console.error("Failed to save assistant message:", error);
                }
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Detailed stream error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}