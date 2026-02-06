// lib/tools.ts
import { db } from '@/db';
import { answer, attachment, conversation, option, question, quiz } from '@/db/schema';
import { tool } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const retrieveAttachmentsTool = tool({
    description: "Retrieve text content from attachments for a quiz",
    inputSchema: z.object({
        quizId: z.string(),
    }),
    execute: async ({ quizId }) => {
        const quizIdNumber = Number(quizId);
        if (Number.isNaN(quizIdNumber)) {
            return [];
        }
        const rows = await db
            .select({
                content: attachment.content,
                filename: attachment.filename,
            })
            .from(quiz)
            .innerJoin(conversation, eq(conversation.quizId, quiz.id))
            .innerJoin(attachment, eq(attachment.conversationId, conversation.id))
            .where(eq(quiz.id, quizIdNumber));

        return rows.filter(r => r.content !== null);
    },
});

export const questionSchema = z.discriminatedUnion("type", [
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
            const quizIdNumber = Number(quizId);
            if (Number.isNaN(quizIdNumber)) {
                return { success: false, error: "Invalid quiz id" };
            }

            let parsedQuestions;

            if (typeof questions === 'string') {
                const sanitized = sanitizeJsonString(questions);
                parsedQuestions = JSON.parse(sanitized);
            } else {
                parsedQuestions = questions;
            }

            // Validate each question against the schema
            const validatedQuestions = z.array(questionSchema).parse(parsedQuestions);

            for (const q of validatedQuestions) {
                const mappedType =
                    q.type === "multiple_choice"
                        ? "choice"
                        : q.type === "true_false"
                            ? "true-false"
                            : q.type === "fill_in_blank"
                                ? "fill-in"
                                : "long-fill-in";

                const [questionRow] = await db
                    .insert(question)
                    .values({
                        quizId: quizIdNumber,
                        type: mappedType,
                        media: null,
                        text: q.question,
                        subText:
                            q.type === "fill_in_blank"
                                ? q.correctAnswer
                                : q.type === "short_answer"
                                    ? q.correctAnswer ?? null
                                    : null,
                    })
                    .returning({ id: question.id });

                if (!questionRow?.id) {
                    continue;
                }

                if (q.type === "multiple_choice") {
                    const optionRows = await db
                        .insert(option)
                        .values(
                            q.options.map((label) => ({
                                questionId: questionRow.id,
                                label,
                            }))
                        )
                        .returning({ id: option.id, label: option.label });

                    const correct =
                        optionRows.find((row) => row.label === q.correctAnswer) ??
                        optionRows[0];

                    if (correct) {
                        await db.insert(answer).values({
                            questionId: questionRow.id,
                            value: correct.id,
                        });
                    }
                }

                if (q.type === "true_false") {
                    const optionRows = await db
                        .insert(option)
                        .values([
                            { questionId: questionRow.id, label: "True" },
                            { questionId: questionRow.id, label: "False" },
                        ])
                        .returning({ id: option.id, label: option.label });

                    const correctLabel = q.correctAnswer ? "True" : "False";
                    const correct = optionRows.find((row) => row.label === correctLabel);

                    if (correct) {
                        await db.insert(answer).values({
                            questionId: questionRow.id,
                            value: correct.id,
                        });
                    }
                }
            }

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
