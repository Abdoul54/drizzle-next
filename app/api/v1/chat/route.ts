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

    const queryText =
        typeof latestUserMessage?.content === "string"
            ? latestUserMessage.content
            : latestUserMessage?.content
                ? JSON.stringify(latestUserMessage.content)
                : "";

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

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        system: `
You are a quiz generator.

Information:
- User's name is ${user?.name}
- User speaks english

Context:
${contextBlock}

You can use the web search tool
`
        ,
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
        },
    });

    return result.toUIMessageStreamResponse();
}