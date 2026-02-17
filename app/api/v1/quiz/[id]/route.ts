import { db } from "@/db";
import { question, quiz, quizVersion } from "@/db/schema";
// import { getCurrentUser } from "@/lib/auth-session";
import { and, count, eq } from "drizzle-orm";
import { NextResponse } from "next/server";


/**
 * GET /api/v1/quizzes/[id]
 * Returns the quiz with its active version info and question count
 */
export async function GET(
    _: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // const user = await getCurrentUser();
    // if (!user) {
    //     return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    // }

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
        .where(and(eq(quiz.id, quizId)))
        .limit(1);

    if (!result.length) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    const quizData = result[0];

    if (!quizData.activeVersion || !quizData.activeVersion.id) {
        return NextResponse.json(
            { message: "Quiz has no active version" },
            { status: 404 }
        );
    }

    const activeVersion = quizData.activeVersion;

    // Get question count for the active version
    const [questionCount] = await db
        .select({ count: count() })
        .from(question)
        .where(eq(question.quizVersionId, activeVersion.id));

    return NextResponse.json({
        id: quizData.id,
        activeVersionId: quizData.activeVersionId,
        createdAt: quizData.createdAt,
        updatedAt: quizData.updatedAt,
        activeVersion: {
            ...activeVersion,
            questionCount: questionCount.count,
        },
    });
}