import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, conversation } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * GET /api/v1/quizzes/[id]/conversations
 */
export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quizId = Number(id);

    if (Number.isNaN(quizId)) {
        return NextResponse.json(
            { message: "Invalid quiz id" },
            { status: 400 }
        );
    }

    // ensure quiz exists AND belongs to user
    const quizExists = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizExists.length) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    const result = await db
        .select()
        .from(conversation)
        .where(
            and(
                eq(conversation.quizId, quizId),
                eq(conversation.userId, user.id)
            )
        )
        .orderBy(conversation.createdAt);

    return NextResponse.json(result);
}


/**
 * POST /api/v1/quizzes/[id]/conversations
 */
export async function POST(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quizId = Number(id);

    if (Number.isNaN(quizId)) {
        return NextResponse.json(
            { message: "Invalid quiz id" },
            { status: 400 }
        );
    }

    const quizExists = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizExists.length) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    const [created] = await db
        .insert(conversation)
        .values({
            quizId,
            userId: user.id,
        })
        .returning({
            id: conversation.id,
            quizId: conversation.quizId,
            userId: conversation.userId,
            createdAt: conversation.createdAt,
        });

    return NextResponse.json(created, { status: 201 });
}
