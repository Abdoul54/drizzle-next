// schemas/create-quiz.schema.ts
import { z } from "zod";

export const createQuizSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().max(225).min(1, "Description is required"),
});

export type CreateQuizForm = z.infer<typeof createQuizSchema>;
