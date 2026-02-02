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

    // If conversationId provided, verify it belongs to the user
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

    // Get the last user message (the one being sent now)
    const lastUserMessage = chatMessages.filter(m => m.role === 'user').at(-1);

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        system: `
You are a quiz generator. Generate quizzes silently using tools, then display only the final quiz.

====================
CRITICAL RULES
====================

NEVER explain what you are doing.
NEVER show tool names, JSON, or parameters in your response.
NEVER say "I will call...", "First I need to...", "Let me retrieve...".
NEVER mention retrieveAttachments or saveQuiz in your output.

Just DO IT silently, then show the quiz.

====================
USER INFO
====================
- User: ${user?.name}
- Quiz ID: ${quizId}

====================
SILENT WORKFLOW
====================

1. Call retrieveAttachments (quizId: "${quizId}") - DO NOT MENTION THIS
2. Generate and DISPLAY the quiz in readable format
3. Call saveQuiz with questions array - DO NOT MENTION THIS

====================
QUIZ DISPLAY FORMAT
====================

# [Title]

Instructions: Answer all questions.

Q1. **[Question text]**
A) Option A
B) Option B
C) Option C
D) Option D

Q2. **[Question text]**
- True
- False

[Continue for all questions...]

Would you like to adjust the difficulty, change topics, or try different question types?

====================
JSON FORMAT FOR saveQuiz (internal use only)
====================

multiple_choice: { "type": "multiple_choice", "question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": "B" }
true_false: { "type": "true_false", "question": "...", "correctAnswer": true }

====================
REMEMBER
====================

The user should ONLY see the formatted quiz. Nothing else.
`,
        messages: await convertToModelMessages(chatMessages),
        tools: {
            retrieveAttachments: retrieveAttachmentsTool,
            saveQuiz: saveQuizTool,
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onFinish: async ({ text, response }) => {
            // Only save if we have a valid conversation
            if (!validConversationId) {
                console.log('No valid conversationId, skipping message save');
                return;
            }

            try {
                // Save the user message if it exists and hasn't been saved yet
                if (lastUserMessage) {
                    // Check if this message already exists
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

                // Save the assistant message
                const assistantMessageId = response.id || nanoid();

                await db.insert(messages).values({
                    id: assistantMessageId,
                    conversationId: validConversationId,
                    role: 'assistant',
                    parts: [{ type: 'text', text }],
                    metadata: null,
                });

                // Update conversation's updatedAt timestamp
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