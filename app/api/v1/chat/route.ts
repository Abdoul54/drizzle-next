import { getCurrentUser } from "@/lib/auth-session";
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { messages } = await req.json();

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        system: `
You are a quiz generator.

Information:
- User's name is ${user?.name}
- User speaks english

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