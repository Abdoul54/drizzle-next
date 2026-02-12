// lib/tools.ts

import { db } from "@/db";
import { conversation } from "@/db/schema";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const localizedString = z
    .record(z.string(), z.string().min(1))
    .describe("Object keyed by language code, e.g. {\"en\": \"Hello\"}");

const questionInput = z.object({
    type: z
        .enum(["single-choice", "multiple-choice", "true-false"])
        .describe(
            "single-choice: exactly 1 correct. multiple-choice: 1+ correct. true-false: exactly 2 options [trueLabel, falseLabel], 1 correct."
        ),
    text: localizedString.describe("Question text"),
    subText: localizedString.optional().describe("Optional hint"),
    options: z
        .array(localizedString)
        .min(2)
        .describe(
            "Answer options. For true-false: exactly 2 items [trueLabel, falseLabel]."
        ),
    correctOptionIndexes: z
        .array(z.number().int().min(0))
        .min(1)
        .describe(
            "Zero-based indexes of correct options. single-choice & true-false: exactly 1. multiple-choice: 1 or more."
        ),
});

export type QuestionInput = z.infer<typeof questionInput>;


export const generateQuiz = tool({
    description:
        "Save quiz questions as draft. All text fields use LocalizedString {langCode: value}. Generate in user's language only unless asked otherwise.",

    inputSchema: z.object({
        conversationId: z.number().int().positive(),
        questions: z.array(questionInput).min(1),
    }),

    execute: async ({ conversationId, questions }) => {
        try {
            console.log("Tool: saving quiz", {
                conversationId,
                questionsCount: questions.length,
            });

            await db
                .update(conversation)
                .set({ draft: { questions } })
                .where(eq(conversation.id, conversationId));

            console.log("Tool: quiz saved");

            return {
                success: true,
                questionCount: questions.length,
                message: "Draft saved. User can review.",
            };
        } catch (error) {
            console.error("Failed to save quiz draft:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error",
            };
        }
    },
});