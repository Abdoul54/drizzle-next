import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, quizVersion } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";
import { updateQuizSchema } from "@/schemas/quiz.schema";

/**
 * GET /api/v1/quizzes/[id]
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

    const result = await db
        .select({
            id: quiz.id,
            activeVersionId: quiz.activeVersionId,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt,
            activeVersion: {
                id: quizVersion.id,
                versionNumber: quizVersion.versionNumber,
                title: quizVersion.title,
                description: quizVersion.description,
                status: quizVersion.status,
                data: quizVersion.data,
                isActive: quizVersion.isActive,
                createdAt: quizVersion.createdAt,
                updatedAt: quizVersion.updatedAt,
            },
        })
        .from(quiz)
        .leftJoin(
            quizVersion,
            and(
                eq(quizVersion.quizId, quiz.id),
                eq(quizVersion.isActive, true)
            )
        )
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!result.length || !result[0].activeVersion) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(result[0]);
}


/**
 * PATCH /api/v1/quizzes/[id]
 * Updates the active version
 */
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = updateQuizSchema.safeParse(json);

    if (!parsed.success) {
        return NextResponse.json(
            { message: "Invalid body", errors: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const { id } = await params;
    const quizId = Number(id);

    if (Number.isNaN(quizId)) {
        return NextResponse.json(
            { message: "Invalid quiz id" },
            { status: 400 }
        );
    }

    const data = parsed.data;

    const updateValues = {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.description !== undefined && data.description !== null
            ? { description: data.description }
            : {}),
    };

    // Find the active version for this quiz
    const activeVersion = await db
        .select({ id: quizVersion.id })
        .from(quiz)
        .leftJoin(
            quizVersion,
            and(
                eq(quizVersion.quizId, quiz.id),
                eq(quizVersion.isActive, true)
            )
        )
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!activeVersion.length || !activeVersion[0].id) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    const [updated] = await db
        .update(quizVersion)
        .set(updateValues)
        .where(eq(quizVersion.id, activeVersion[0].id))
        .returning({
            id: quizVersion.id,
            versionNumber: quizVersion.versionNumber,
            title: quizVersion.title,
            description: quizVersion.description,
            status: quizVersion.status,
            updatedAt: quizVersion.updatedAt,
        });

    if (!updated) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    return NextResponse.json(updated);
}

/**
 * DELETE /api/v1/quizzes/[id]
 * Deletes the entire quiz (cascade deletes all versions)
 */
export async function DELETE(
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

    const [deleted] = await db
        .delete(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .returning({ id: quiz.id });

    if (!deleted) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}