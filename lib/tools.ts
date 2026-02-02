// lib/tools.ts
import { db } from '@/db';
import { attachments, conversations, quizzes } from '@/db/schema';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const retrieveAttachmentsTool = tool({
    description: "Retrieve text content from attachments for a quiz",
    inputSchema: z.object({
        quizId: z.string(),
    }),
    execute: async ({ quizId }) => {
        const rows = await db
            .select({
                content: attachments.content,
                filename: attachments.filename,
            })
            .from(quizzes)
            .innerJoin(conversations, eq(conversations.quizId, quizzes.id))
            .innerJoin(attachments, eq(attachments.conversationId, conversations.id))
            .where(eq(quizzes.id, quizId));

        return rows.filter(r => r.content !== null);
    },
});

const questionSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("multiple_choice"),
        question: z.string(),
        options: z.array(z.string()).min(2),
        correctAnswer: z.string(),
    }),
    z.object({
        type: z.literal("true_false"),
        question: z.string(),
        correctAnswer: z.union([z.boolean(), z.string()]).transform((val) =>
            typeof val === 'string' ? val.toLowerCase() === 'true' : val
        ),
    }),
    z.object({
        type: z.literal("short_answer"),
        question: z.string(),
        correctAnswer: z.string().optional(),
    }),
    z.object({
        type: z.literal("fill_in_blank"),
        question: z.string(),
        correctAnswer: z.string(),
    }),
]);


function sanitizeJsonString(str: string): string {
    return str
        // German/Polish quotes
        .replace(/„/g, '"')
        .replace(/"/g, '"')
        // French quotes
        .replace(/«/g, '"')
        .replace(/»/g, '"')
        // Smart quotes
        .replace(/"/g, '"')
        .replace(/"/g, '"')
        .replace(/'/g, "'")
        .replace(/'/g, "'");
}

export const saveQuizTool = tool({
    description: "Save the generated quiz questions to the database. Call this AFTER displaying the quiz to the user.",
    inputSchema: z.object({
        quizId: z.string(),
        questions: z.union([
            z.array(questionSchema),
            z.string(),
        ]),
    }),
    execute: async ({ quizId, questions }) => {
        try {
            let parsedQuestions;

            if (typeof questions === 'string') {
                const sanitized = sanitizeJsonString(questions);
                parsedQuestions = JSON.parse(sanitized);
            } else {
                parsedQuestions = questions;
            }

            // Validate each question against the schema
            const validatedQuestions = z.array(questionSchema).parse(parsedQuestions);

            await db
                .update(quizzes)
                .set({
                    data: { questions: validatedQuestions },
                    status: 'draft',
                })
                .where(eq(quizzes.id, quizId));

            return { success: true, questionCount: validatedQuestions.length };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return { success: false, error: "Invalid question format", details: error.message };
            }
            if (error instanceof SyntaxError) {
                return { success: false, error: "Invalid JSON format" };
            }
            return { success: false, error: "Failed to save quiz" };
        }
    },
});