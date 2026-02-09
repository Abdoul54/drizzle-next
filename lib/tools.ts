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

const localizedString = z.record(
    z.string(), // language code (en, fr, ar…)
    z.string().min(1)
);

const questionInput = z.object({
    type: z.enum(questionTypeValues),

    // translated question
    text: localizedString.describe("Translated question text"),

    // optional hint
    subText: localizedString
        .optional()
        .describe("Translated hint or subtitle"),

    // optional media
    media: z.string().optional().describe("Optional media URL"),

    // options translated per language
    options: z
        .array(localizedString)
        .min(2)
        .describe("Translated answer option labels"),

    // correct answers
    correctOptionIndexes: z
        .array(z.number().int().min(0))
        .min(1)
        .describe("Zero-based indexes of correct options"),
});


export const generateQuiz = tool({
    description:
        "Save generated quiz questions as draft for this conversation. Only generate in user language unless asked otherwise.",

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
