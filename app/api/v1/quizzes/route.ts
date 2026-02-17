import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, quizVersion, user } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { createQuizSchema } from "@/schemas/quiz.schema";
import { getCurrentUser } from "@/lib/auth-session";

type QuizStatus = "draft" | "published" | "unpublished";

function isQuizStatus(value: string | null): value is QuizStatus {
    return value === "draft" || value === "published" || value === "unpublished";
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    try {
        const query = db
            .select({
                id: quiz.id,
                title: quizVersion.title,
                description: quizVersion.description,
                status: quizVersion.status,
                versionNumber: quizVersion.versionNumber,
                activeVersionId: quiz.activeVersionId,
                createdAt: quiz.createdAt,
                createdBy: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            })
            .from(quiz)
            .leftJoin(user, eq(quiz.createdBy, user.id))
            .leftJoin(
                quizVersion,
                and(
                    eq(quizVersion.quizId, quiz.id),
                    eq(quizVersion.isActive, true)
                )
            )
            .orderBy(desc(quiz.createdAt));

        const quizzes = isQuizStatus(statusParam)
            ? await query.where(eq(quizVersion.status, statusParam))
            : await query;

        return NextResponse.json(quizzes);
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Failed to fetch quizzes" },
            { status: 500 }
        );
    }
}


export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const json = await req.json();
        const parsed = createQuizSchema.safeParse(json);

        if (!parsed.success) {
            return NextResponse.json(
                {
                    message: "Invalid request body",
                    errors: parsed.error.flatten(),
                },
                { status: 400 }
            );
        }

        const { title, description } = parsed.data;

        // Create quiz and initial version in a transaction
        const result = await db.transaction(async (tx) => {
            // 1. Create the quiz
            const [newQuiz] = await tx
                .insert(quiz)
                .values({
                    createdBy: user.id,
                })
                .returning({
                    id: quiz.id,
                    createdAt: quiz.createdAt,
                });

            // 2. Create version 1
            const [version] = await tx
                .insert(quizVersion)
                .values({
                    quizId: newQuiz.id,
                    versionNumber: 1,
                    title,
                    description: description ?? null,
                    status: "draft",
                    isActive: true,
                    createdBy: user.id,
                })
                .returning({
                    id: quizVersion.id,
                    title: quizVersion.title,
                    description: quizVersion.description,
                    status: quizVersion.status,
                    versionNumber: quizVersion.versionNumber,
                });

            // 3. Set as active version
            await tx
                .update(quiz)
                .set({ activeVersionId: version.id })
                .where(eq(quiz.id, newQuiz.id));

            return {
                id: newQuiz.id,
                title: version.title,
                description: version.description,
                status: version.status,
                versionNumber: version.versionNumber,
                activeVersionId: version.id,
                createdAt: newQuiz.createdAt,
            };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Failed to create quiz" },
            { status: 500 }
        );
    }
}