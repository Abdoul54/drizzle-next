import { db } from "@/db";
import { conversation } from "@/db/schema";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const questionTypeValues = [
    "choice",
    "true-false",
    "fill-in",
    "long-fill-in",
    "matching",
    "sequencing",
    "numeric",
    "likert",
    "performance",
] as const;

const questionInput = z.object({
    type: z.enum(questionTypeValues),
    text: z.string().min(1).describe("The question text"),
    subText: z.string().optional().describe("Optional hint or subtitle"),
    media: z.string().optional().describe("Optional media URL"),
    options: z
        .array(z.string().min(1))
        .min(2)
        .describe("Answer option labels"),
    correctOptionIndexes: z
        .array(z.number().int().min(0))
        .min(1)
        .describe("Zero-based indexes of correct options"),
});

export const generateQuiz = tool({
    description:
        "Save generated quiz questions as a draft on the current conversation. The user can review, request edits, and approve when ready.",
    inputSchema: z.object({
        conversationId: z.number().int().positive().describe("The conversation ID"),
        questions: z.array(questionInput).min(1).describe("Array of questions"),
    }),
    execute: async ({ conversationId, questions }) => {
        try {
            console.log("Tool: saving quiz", { conversationId, questions });

            await db
                .update(conversation)
                .set({ draft: { questions } })
                .where(eq(conversation.id, conversationId));

            console.log("Tool: quiz saved");
            return {
                success: true,
                questionCount: questions.length,
                message: "Draft saved. The user can review and approve when ready.",
            };
        } catch (error) {
            console.error("Failed to save quiz draft:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});