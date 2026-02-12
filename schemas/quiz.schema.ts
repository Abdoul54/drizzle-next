// schemas/quiz.schema.ts
import { z } from "zod";

/** At least one language key with a non-empty value */
export const localizedStringSchema = z
    .record(z.string(), z.string().min(1))
    .refine((obj) => Object.keys(obj).length > 0, {
        message: "At least one language is required",
    });

export const createQuizSchema = z.object({
    title: localizedStringSchema,
    description: localizedStringSchema.optional(),
});

export type CreateQuizForm = z.infer<typeof createQuizSchema>;

export const updateQuizSchema = z.object({
    title: localizedStringSchema.optional(),
    description: localizedStringSchema.nullable().optional(),
    status: z.enum(["draft", "published", "unpublished"]).optional(),
});

export type UpdateQuizForm = z.infer<typeof updateQuizSchema>;