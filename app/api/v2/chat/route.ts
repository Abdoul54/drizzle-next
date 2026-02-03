import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { openai } from '@ai-sdk/openai';
import { retrieveAttachmentsTool, saveQuizTool } from "@/lib/tools";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

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
You are an ai assistant.

Information:
- User's name is ${user?.name}
- User speaks english
`
        ,
        messages: await convertToModelMessages(messages),
        onStepFinish: ({ toolCalls, toolResults }) => {
            console.log('Step finished:', { toolCalls, toolResults });
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onFinish: async ({ text, response }) => {
            console.log('Stream Finished')
        },
    });

    return result.toUIMessageStreamResponse();
}