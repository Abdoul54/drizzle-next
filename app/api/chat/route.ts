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

    const { messages: chatMessages, conversationId, quizId }: {
        messages: UIMessage[];
        conversationId?: string;
        quizId?: string;
    } = await req.json();

    let validConversationId: string | null = null;

    if (conversationId) {
        const [conversation] = await db
            .select()
            .from(conversations)
            .where(
                and(
                    eq(conversations.id, conversationId),
                    eq(conversations.userId, user.id)
                )
            )
            .limit(1);

        if (conversation) {
            validConversationId = conversation.id;
        }
    }

    const lastUserMessage = chatMessages.filter(m => m.role === 'user').at(-1);

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        prepareStep: ({ steps }) => {
            const calledTools = steps.flatMap(step =>
                step.toolCalls?.map(call => call.toolName) ?? []
            );

            const hasRetrieved = calledTools.includes('retrieveAttachments');
            const hasSaved = calledTools.includes('saveQuiz');

            // Step 1: Force retrieveAttachments
            if (!hasRetrieved) {
                return {
                    toolChoice: { type: 'tool', toolName: 'retrieveAttachments' }
                };
            }

            // Step 2: Force saveQuiz after retrieval
            if (hasRetrieved && !hasSaved) {
                return {
                    toolChoice: { type: 'tool', toolName: 'saveQuiz' }
                };
            }

            // Step 3: After both tools called, generate text response
            return { toolChoice: 'none' };
        },
        system: `
You are a quiz generator.

Information:
- User's name is ${user?.name}
- User speaks english
- quizId is ${quizId}

RULES:
- Do not mention tools or internal steps
- When calling saveQuiz, return ONLY a JSON array of questions
- After tools complete, display the quiz in the format below

QUIZ DISPLAY FORMAT:
# [Title]

Q1. **Question**
A) ...
B) ...
C) ...
D) ...

Q2. **Question**
- True
- False

QUESTION JSON FORMATS:
multiple_choice: { "type": "multiple_choice", "question": "...", "options": ["A","B","C","D"], "correctAnswer": "B" }
true_false: { "type": "true_false", "question": "...", "correctAnswer": true }
short_answer: { "type": "short_answer", "question": "..." }
fill_in_blank: { "type": "fill_in_blank", "question": "The ___ is...", "correctAnswer": "answer" }
`
        ,
        messages: await convertToModelMessages(chatMessages),
        tools: {
            retrieveAttachments: retrieveAttachmentsTool,
            saveQuiz: saveQuizTool,
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
            if (!validConversationId) {
                console.log('No valid conversationId, skipping message save');
                return;
            }

            try {
                if (lastUserMessage) {
                    const [existingUserMsg] = await db
                        .select()
                        .from(messages)
                        .where(eq(messages.id, lastUserMessage.id))
                        .limit(1);

                    if (!existingUserMsg) {
                        await db.insert(messages).values({
                            id: lastUserMessage.id,
                            conversationId: validConversationId,
                            role: 'user',
                            parts: lastUserMessage.parts || [{ type: 'text', text: '' }],
                            metadata: lastUserMessage.metadata || null,
                        });
                    }
                }

                const assistantMessageId = response.id || nanoid();

                await db.insert(messages).values({
                    id: assistantMessageId,
                    conversationId: validConversationId,
                    role: 'assistant',
                    parts: [{ type: 'text', text }],
                    metadata: null,
                });

                await db
                    .update(conversations)
                    .set({ updatedAt: new Date() })
                    .where(eq(conversations.id, validConversationId));

                console.log('Messages saved successfully');
            } catch (error) {
                console.error('Failed to save messages:', error);
            }
        },
    });

    return result.toUIMessageStreamResponse();
}