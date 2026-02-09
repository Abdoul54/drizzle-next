// app/api/v1/chat/route.improved.ts
// This is an improved version with all enhancements applied

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
import { languageCodes } from "@/utils/languages";
import { chatRateLimiter, withRateLimit } from "@/lib/rate-limit";
import { truncateToTokenBudget } from "@/lib/token-budget";

export const maxDuration = 30;

// Error types for better error handling
class RateLimitError extends Error {
    constructor(message: string, public headers: Record<string, string>) {
        super(message);
        this.name = 'RateLimitError';
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export async function POST(req: Request) {
    try {
        // 1. AUTHENTICATION
        const user = await getCurrentUser();
        if (!user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized", code: "AUTH_REQUIRED" }),
                {
                    status: 401,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // 2. RATE LIMITING
        const rateLimitResult = withRateLimit(chatRateLimiter, user.id);
        if (!rateLimitResult.success) {
            throw new RateLimitError(rateLimitResult.error, rateLimitResult.headers);
        }

        // 3. REQUEST VALIDATION
        const body = await req.json();
        const { messages, conversationId, quizId } = body;

        if (!messages || !Array.isArray(messages)) {
            throw new ValidationError("Invalid messages format");
        }

        const convId = parseId(conversationId);
        const qzId = parseId(quizId) ?? undefined;

        // 4. SAVE USER MESSAGE
        if (convId) {
            await saveUserMessage(messages, convId);
        }

        // 5. PROCESS MESSAGES (file extraction)
        const processedMessages = await convertTextFilesToContent(messages);
        const queryText = extractQueryText(processedMessages);

        // 6. BUILD RAG CONTEXT WITH TOKEN BUDGET
        let contextBlock = "No user query available.";
        let ragMetadata = { truncated: false, originalTokens: 0, allocatedTokens: 0 };

        if (queryText) {
            const { context: rawContext } = await buildRagContext({
                query: queryText,
                quizId: qzId,
                conversationId: convId,
            });

            // Apply token budget (max 4000 tokens for RAG context)
            const {
                text: truncatedContext,
                originalTokens,
                truncatedTokens,
                wasTruncated,
            } = truncateToTokenBudget(rawContext, 4000);

            contextBlock = truncatedContext;
            ragMetadata = {
                truncated: wasTruncated,
                originalTokens,
                allocatedTokens: truncatedTokens,
            };

            // Log if context was truncated
            if (wasTruncated) {
                console.warn(`RAG context truncated: ${originalTokens} → ${truncatedTokens} tokens`);
            }
        }

        const assistantMessageId = generateId();

        // 7. STREAM WITH ERROR BOUNDARIES
        const result = streamText({
            model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
            system: `You are a professional AI quiz generator.

========================
USER INFORMATION
========================
- User name: ${user?.name}
- User ID: ${user?.id}
- User speaks: English
- Quiz id: ${quizId || 'N/A'}
- Conversation id: ${conversationId || 'N/A'}
- Supported languages: ${languageCodes.join(", ")}

========================
CONTEXT FROM DOCUMENTS
========================
${contextBlock}

${ragMetadata.truncated ? `⚠️ Context was truncated from ${ragMetadata.originalTokens} to ${ragMetadata.allocatedTokens} tokens` : ''}

This context comes from files the user uploaded to this quiz.
If the user asks about documents, PDFs, or content:
- Use ONLY this context
- Be precise
- Reference key facts from it
${ragMetadata.truncated ? '- Note: Some content may be truncated due to length' : ''}

========================
QUIZ GENERATION BEHAVIOR
========================
You generate quizzes and save them using a tool.

When the user asks to:
- create quiz
- generate questions
- make exam
- make test
- add questions

You MUST call the generateQuiz tool.

NEVER output quiz questions in assistant text.
ALWAYS use the tool.

The quiz should:
- match user request
- be clear and well written
- have correct answers
- be logically structured

========================
LANGUAGE RULES (CRITICAL)
========================
Generate quiz ONLY in the language the user is speaking.

Default:
- If user speaks English → generate ONLY English
- Do NOT include other languages
- Do NOT auto translate

If user explicitly asks:
"add french"
"make arabic version"
"add multiple languages"

THEN include those languages.

Otherwise → ONE language only.

========================
TOOL FORMAT (VERY IMPORTANT)
========================
When calling generateQuiz tool you MUST use this exact structure:

{
  "conversationId": number,
  "questions": [
    {
      "type": "choice",
      "text": { "en": "Question text here" },
      "subText": { "en": "Optional hint here" },
      "options": [
        { "en": "Option 1" },
        { "en": "Option 2" },
        { "en": "Option 3" },
        { "en": "Option 4" }
      ],
      "correctOptionIndexes": [0]
    }
  ]
}

STRICT RULES:
- NEVER use field "question"
- ALWAYS use "text"
- text MUST be an object with language keys
- options MUST be array of objects with language keys
- Even for ONE language → still object format
- correctOptionIndexes must match correct answers
- NEVER output quiz in assistant text
- ALWAYS call generateQuiz tool

========================
GENERAL BEHAVIOR
========================
Be intelligent and helpful.
Be concise.
Do not explain tool usage to the user.
Just call the tool when quiz generation is requested.
`,
            messages: await convertToModelMessages(processedMessages),
            tools: {
                generateQuiz,
            },
            // Multi-step tool execution with step limit
            stopWhen: stepCountIs(10),

            // Error handling callback
            onError: async ({ error }) => {
                console.error('[Chat Stream Error]', {
                    error: error,
                    userId: user.id,
                    conversationId: convId,
                    timestamp: new Date().toISOString(),
                });

                // You can add additional error tracking here
                // e.g., send to error monitoring service like Sentry
            },

            // Save on successful completion
            onFinish: async ({ text, steps, totalUsage }) => {
                if (!convId) return;

                try {
                    await saveAssistantMessage({
                        id: assistantMessageId,
                        conversationId: convId,
                        text,
                        steps,
                    });

                    console.log('[Chat Complete]', {
                        userId: user.id,
                        conversationId: convId,
                        messageLength: text.length,
                        stepCount: steps.length,
                        usage: totalUsage,
                        timestamp: new Date().toISOString(),
                    });
                } catch (error) {
                    console.error('[Save Message Error]', {
                        error: error instanceof Error ? error.message : 'Unknown error',
                        userId: user.id,
                        conversationId: convId,
                    });

                    // Don't throw - we don't want to break the stream
                    // The message was already sent to the user
                }
            },
        });

        // Return streaming response
        return result.toUIMessageStreamResponse();

    } catch (error) {
        console.error('[Chat API Error]', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
        });

        // Handle specific error types
        if (error instanceof RateLimitError) {
            return new Response(
                JSON.stringify({
                    error: error.message,
                    code: 'RATE_LIMIT_EXCEEDED',
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        ...error.headers,
                    },
                }
            );
        }

        if (error instanceof ValidationError) {
            return new Response(
                JSON.stringify({
                    error: error.message,
                    code: 'VALIDATION_ERROR',
                }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Generic error response
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Internal server error',
                code: 'INTERNAL_ERROR',
                // Only include details in development
                ...(process.env.NODE_ENV === 'development' && {
                    details: error instanceof Error ? error.stack : undefined,
                }),
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}