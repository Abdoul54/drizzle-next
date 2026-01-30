import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json(
                { error: "Invalid quiz ID" },
                { status: 400 }
            );
        }

        const quiz = await db
            .select()
            .from(quizzes)
            .where(eq(quizzes.id, id))
            .limit(1);

        if (!quiz.length) {
            return NextResponse.json(
                { error: "Quiz not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(quiz[0]);
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch quiz" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db.delete(quizzes).where(eq(quizzes.id, id));

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Failed to delete quiz" },
            { status: 500 }
        );
    }
}
