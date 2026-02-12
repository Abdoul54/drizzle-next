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
import { buildSystemPrompt } from "@/lib/system-prompt";
import { chatRateLimiter, withRateLimit } from "@/lib/rate-limit";
import { truncateToTokenBudget } from "@/lib/token-budget";
import { conversation } from "@/db/schema";
import { db } from "@/db";
import { eq } from "drizzle-orm";

export const maxDuration = 30;

class RateLimitError extends Error {
    constructor(message: string, public headers: Record<string, string>) {
        super(message);
        this.name = "RateLimitError";
    }
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
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
        const selection = [...messages].reverse().find(m => m.role === 'user')?.metadata?.selection || null;
        console.log(selection);


        const queryText = extractQueryText(processedMessages);

        // 6. BUILD RAG CONTEXT WITH TOKEN BUDGET
        let contextBlock = "No user query available.";
        let ragMetadata = {
            truncated: false,
            originalTokens: 0,
            allocatedTokens: 0,
        };

        if (queryText) {
            const { context: rawContext } = await buildRagContext({
                query: queryText,
                quizId: qzId,
                conversationId: convId,
            });

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

            if (wasTruncated) {
                console.warn(
                    `RAG context truncated: ${originalTokens} → ${truncatedTokens} tokens`
                );
            }
        }

        // 7. LOAD CURRENT DRAFT
        let currentDraft = null;
        if (convId) {
            const [conv] = await db
                .select({ draft: conversation.draft })
                .from(conversation)
                .where(eq(conversation.id, convId))
                .limit(1);
            currentDraft = conv?.draft;
        }

        const assistantMessageId = generateId();

        // 8. STREAM
        const result = streamText({
            model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
            system: buildSystemPrompt({
                userName: user.name,
                userId: user.id,
                quizId: quizId || null,
                conversationId: conversationId || null,
                selection,
                contextBlock,
                ragMetadata,
                currentDraft,
            }),
            messages: await convertToModelMessages(processedMessages),
            tools: {
                generateQuiz,
            },
            stopWhen: stepCountIs(10),
            maxOutputTokens: 10000,
            maxRetries: 2,

            onError: async ({ error }) => {
                console.error("[Chat Stream Error]", {
                    error,
                    userId: user.id,
                    conversationId: convId,
                    timestamp: new Date().toISOString(),
                });
            },

            onFinish: async ({ text, steps, totalUsage }) => {
                if (!convId) return;

                try {
                    await saveAssistantMessage({
                        id: assistantMessageId,
                        conversationId: convId,
                        text,
                    });

                    // console.log("[Chat Complete]", {
                    //     userId: user.id,
                    //     conversationId: convId,
                    //     messageLength: text.length,
                    //     stepCount: steps.length,
                    //     usage: totalUsage,
                    //     timestamp: new Date().toISOString(),
                    // });
                } catch (error) {
                    console.error("[Save Message Error]", {
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                        userId: user.id,
                        conversationId: convId,
                    });
                }
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error("[Chat API Error]", {
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
        });

        if (error instanceof RateLimitError) {
            return new Response(
                JSON.stringify({
                    error: error.message,
                    code: "RATE_LIMIT_EXCEEDED",
                }),
                {
                    status: 429,
                    headers: {
                        "Content-Type": "application/json",
                        ...error.headers,
                    },
                }
            );
        }

        if (error instanceof ValidationError) {
            return new Response(
                JSON.stringify({
                    error: error.message,
                    code: "VALIDATION_ERROR",
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        return new Response(
            JSON.stringify({
                error:
                    error instanceof Error
                        ? error.message
                        : "Internal server error",
                code: "INTERNAL_ERROR",
                ...(process.env.NODE_ENV === "development" && {
                    details:
                        error instanceof Error ? error.stack : undefined,
                }),
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" },
            }
        );
    }
}