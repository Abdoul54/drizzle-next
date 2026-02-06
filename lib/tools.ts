


import { db } from "@/db";
import { attachment, quiz } from "@/db/schema";
import { tool } from "ai";
import { and, eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

const quizIdSchema = z.coerce.number().int().positive();
const conversationIdSchema = z.coerce.number().int().positive().optional();

const questionSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("multiple_choice"),
        question: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        correctAnswer: z.string().min(1),
    }),
    z.object({
        type: z.literal("true_false"),
        question: z.string().min(1),
        correctAnswer: z.union([z.boolean(), z.string()]).transform((val) =>
            typeof val === "string" ? val.toLowerCase() === "true" : val
        ),
    }),
    z.object({
        type: z.literal("short_answer"),
        question: z.string().min(1),
        correctAnswer: z.string().optional(),
    }),
    z.object({
        type: z.literal("fill_in_blank"),
        question: z.string().min(1),
        correctAnswer: z.string().min(1),
    }),
]);

function sanitizeJsonString(value: string): string {
    return value
        .replace(/„/g, '"')
        .replace(/“/g, '"')
        .replace(/”/g, '"')
        .replace(/«/g, '"')
        .replace(/»/g, '"')
        .replace(/‘/g, "'")
        .replace(/’/g, "'");
}

function parseQuestions(
    input: z.infer<typeof questionSchema>[] | string
): z.infer<typeof questionSchema>[] {
    if (typeof input !== "string") {
        return input;
    }

    const sanitized = sanitizeJsonString(input);
    const parsed = JSON.parse(sanitized) as unknown;
    return z.array(questionSchema).parse(parsed);
}

export const retrieveAttachmentsTool = tool({
    description: "Retrieve text content from attachments for a quiz",
    inputSchema: z.object({
        quizId: z.string(),
        conversationId: z.string().optional(),
    }),
    execute: async ({ quizId, conversationId }) => {
        const parsedQuizId = quizIdSchema.safeParse(quizId);
        if (!parsedQuizId.success) {
            return [];
        }

        const parsedConversationId = conversationIdSchema.safeParse(
            conversationId
        );
        const conversationIdValue = parsedConversationId.success
            ? parsedConversationId.data
            : undefined;

        const rows = await db
            .select({
                content: attachment.content,
                filename: attachment.filename,
            })
            .from(attachment)
            .where(
                and(
                    eq(attachment.quizId, parsedQuizId.data),
                    conversationIdValue
                        ? or(
                            eq(attachment.conversationId, conversationIdValue),
                            isNull(attachment.conversationId)
                        )
                        : isNull(attachment.conversationId)
                )
            );

        return rows.filter((row) => row.content !== null);
    },
});


export const saveQuizTool = tool({
    description:
        "Save the generated quiz questions to the database. Call this AFTER displaying the quiz to the user.",
    inputSchema: z.object({
        quizId: z.string(),
        questions: z.union([z.array(questionSchema), z.string()]),
    }),
    execute: async ({ quizId, questions }) => {
        const parsedQuizId = quizIdSchema.safeParse(quizId);
        if (!parsedQuizId.success) {
            return { success: false, error: "Invalid quiz id" };
        }

        try {
            const parsedQuestions = parseQuestions(questions);
            const validatedQuestions = z
                .array(questionSchema)
                .parse(parsedQuestions);

            await db
                .update(quiz)
                .set({
                    data: { questions: validatedQuestions },
                    status: "draft",
                })
                .where(eq(quiz.id, parsedQuizId.data));

            return { success: true, questionCount: validatedQuestions.length };
        } catch (error) {
            if (error instanceof z.ZodError) {
                return {
                    success: false,
                    error: "Invalid question format",
                    details: error.message,
                };
            }
            if (error instanceof SyntaxError) {
                return { success: false, error: "Invalid JSON format" };
            }
            return { success: false, error: "Failed to save quiz" };
        }
    },
});

export { questionSchema };