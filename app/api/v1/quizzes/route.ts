import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, user } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
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
                title: quiz.title,
                description: quiz.description,
                status: quiz.status,
                createdAt: quiz.createdAt,
                createdBy: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            })
            .from(quiz)
            .leftJoin(user, eq(quiz.createdBy, user.id))
            .orderBy(desc(quiz.createdAt));

        const quizzes = isQuizStatus(statusParam)
            ? await query.where(eq(quiz.status, statusParam))
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

        const [createdQuiz] = await db
            .insert(quiz)
            .values({
                title,
                createdBy: user.id,
                description: description ?? null, // nullable column
            })
            .returning({
                id: quiz.id,
                title: quiz.title,
                description: quiz.description,
                status: quiz.status,
                createdAt: quiz.createdAt,
            });

        return NextResponse.json(createdQuiz, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { message: "Failed to create quiz" },
            { status: 500 }
        );
    }
}
