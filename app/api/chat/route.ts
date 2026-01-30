import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { ollama } from '@/lib/ollama';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
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

    const { messages: chatMessages, conversationId }: {
        messages: UIMessage[];
        conversationId?: string;
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
        model: ollama(process.env.MODEL as string),
        system: `
You are a professional quiz generator for an e-learning platform.

SUPPORTED QUESTION TYPES:
- multiple_choice
- true_false
- short_answer
- fill_in_blank

When generating quizzes, you MUST strictly follow the requested question types.

FORMAT RULES:
- Title at the top
- Instructions below the title
- Each question must:
  - Start with: Q1., Q2., Q3.
  - Question text must be in **bold**
  - Be on its own line
- Leave one blank line between questions

QUESTION TYPE FORMATS:

1️⃣ multiple_choice
- Use options a., b., c., d.
- Each option on its own line
- Show correct answer

Example:
Q1. **What does console.log do?**

a. Displays output in the console  
b. Stores data locally  
c. Sends data to a server  
d. Creates a variable  

Correct Answer: a

---

2️⃣ true_false
- Only two options
- Use: a. True / b. False

Example:
Q2. **JavaScript is a statically typed language.**

a. True  
b. False  

Correct Answer: b

---

3️⃣ short_answer
- No options
- Provide expected answer

Example:
Q3. **What keyword is used to declare a constant in JavaScript?**

Correct Answer: const

---

4️⃣ fill_in_blank
- Use "_____" for blank
- Provide correct answer

Example:
Q4. **The _____ keyword is used to declare a variable that cannot be reassigned.**

Correct Answer: const

---

STRICT RULES:
- Follow the requested question types ONLY
- NEVER mix formats
- NEVER inline options
- NEVER explain answers
- DO NOT change formatting
- If required info is missing, ask for:
  - topic
  - number of questions
  - difficulty
  - question types

Only generate quizzes when appropriate.
`,
        messages: await convertToModelMessages(chatMessages),
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