/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/tools.ts

import { db } from "@/db";
import { conversation } from "@/db/schema";
import { tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const localizedString = z
    .record(z.string(), z.string().min(1))
    .describe('Object keyed by language code, e.g. {"en": "Hello"}');

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

// ─── GENERATE QUIZ (full draft) ─────────────────────────────────
export const generateQuiz = tool({
    description:
        "Save quiz questions as draft. Use for creating new quizzes or making complex edits (rewriting, translating, reordering). All text fields use LocalizedString {langCode: value}.",

    inputSchema: z.object({
        conversationId: z.number().int().positive(),
        questions: z.array(questionInput).min(1),
    }),

    execute: async ({ conversationId, questions }) => {
        try {
            await db
                .update(conversation)
                .set({ draft: { questions } })
                .where(eq(conversation.id, conversationId));

            return {
                success: true,
                questionCount: questions.length,
                message: "Draft saved. User can review.",
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

// ─── REMOVE OPTION ──────────────────────────────────────────────
export const removeOption = tool({
    description:
        "Remove a single option from a question by index. Use when the user wants to delete/remove an option. Automatically fixes correctOptionIndexes.",

    inputSchema: z.object({
        conversationId: z.number().int().positive(),
        questionIndex: z.number().int().min(0).describe("Zero-based index of the question in the draft"),
        optionIndex: z.number().int().min(0).describe("Zero-based index of the option to remove"),
    }),

    execute: async ({ conversationId, questionIndex, optionIndex }) => {
        try {
            const [conv] = await db
                .select({ draft: conversation.draft })
                .from(conversation)
                .where(eq(conversation.id, conversationId))
                .limit(1);

            if (!conv?.draft) {
                return { success: false, error: "No draft found" };
            }

            const draft = structuredClone(conv.draft) as { questions: any[] };
            const question = draft.questions[questionIndex];

            if (!question) {
                return { success: false, error: `Question index ${questionIndex} not found` };
            }

            if (!question.options[optionIndex]) {
                return { success: false, error: `Option index ${optionIndex} not found` };
            }

            if (question.options.length <= 2) {
                return { success: false, error: "Cannot remove — minimum 2 options required" };
            }

            // Remove the option
            question.options.splice(optionIndex, 1);

            // Fix correctOptionIndexes
            question.correctOptionIndexes = question.correctOptionIndexes
                .map((idx: number) => {
                    if (idx === optionIndex) return null;
                    return idx > optionIndex ? idx - 1 : idx;
                })
                .filter((idx: number | null): idx is number => idx !== null);

            if (question.correctOptionIndexes.length === 0) {
                question.correctOptionIndexes = [0];
            }

            await db
                .update(conversation)
                .set({ draft })
                .where(eq(conversation.id, conversationId));

            return {
                success: true,
                message: `Option ${optionIndex} removed from question ${questionIndex}.`,
                remainingOptions: question.options.length,
            };
        } catch (error) {
            console.error("Failed to remove option:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});

// ─── REMOVE QUESTION ────────────────────────────────────────────
export const removeQuestion = tool({
    description:
        "Remove an entire question from the draft by index. Use when the user wants to delete/remove a whole question.",

    inputSchema: z.object({
        conversationId: z.number().int().positive(),
        questionIndex: z.number().int().min(0).describe("Zero-based index of the question to remove"),
    }),

    execute: async ({ conversationId, questionIndex }) => {
        try {
            const [conv] = await db
                .select({ draft: conversation.draft })
                .from(conversation)
                .where(eq(conversation.id, conversationId))
                .limit(1);

            if (!conv?.draft) {
                return { success: false, error: "No draft found" };
            }

            const draft = structuredClone(conv.draft) as { questions: any[] };

            if (!draft.questions[questionIndex]) {
                return { success: false, error: `Question index ${questionIndex} not found` };
            }

            if (draft.questions.length <= 1) {
                return { success: false, error: "Cannot remove the last question" };
            }

            draft.questions.splice(questionIndex, 1);

            await db
                .update(conversation)
                .set({ draft })
                .where(eq(conversation.id, conversationId));

            return {
                success: true,
                message: `Question ${questionIndex} removed.`,
                remainingQuestions: draft.questions.length,
            };
        } catch (error) {
            console.error("Failed to remove question:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            };
        }
    },
});