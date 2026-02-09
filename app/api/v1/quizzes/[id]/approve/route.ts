// app/api/v1/quizzes/[id]/approve/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, question, option, answer, conversation } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const quizId = Number(id);
    if (Number.isNaN(quizId)) {
        return NextResponse.json({ message: "Invalid quiz id" }, { status: 400 });
    }

    // Verify quiz ownership
    const [quizRow] = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizRow) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    // Get conversationId from body
    const { conversationId } = await req.json().catch(() => ({}));
    const convId = Number(conversationId);

    if (!convId || Number.isNaN(convId)) {
        return NextResponse.json(
            { message: "conversationId is required" },
            { status: 400 }
        );
    }

    // Fetch conversation draft
    const [conv] = await db
        .select({ draft: conversation.draft })
        .from(conversation)
        .where(
            and(
                eq(conversation.id, convId),
                eq(conversation.quizId, quizId),
                eq(conversation.userId, user.id)
            )
        )
        .limit(1);

    if (!conv) {
        return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draft = conv.draft as { questions: any[] } | null;
    if (!draft?.questions?.length) {
        return NextResponse.json(
            { message: "No draft questions to approve" },
            { status: 400 }
        );
    }

    try {
        // Clear existing questions (re-approve replaces)
        await db.delete(question).where(eq(question.quizId, quizId));

        for (const q of draft.questions) {
            const [inserted] = await db
                .insert(question)
                .values({
                    quizId,
                    type: q.type,
                    text: q.text,
                    subText: q.subText ?? null,
                    media: q.media ?? null,
                })
                .returning({ id: question.id });

            const insertedOptions = await db
                .insert(option)
                .values(
                    q.options.map((label: string) => ({
                        questionId: inserted.id,
                        label,
                    }))
                )
                .returning({ id: option.id });

            const answerValues = (q.correctOptionIndexes as number[])
                .filter((idx) => idx < insertedOptions.length)
                .map((idx) => ({
                    questionId: inserted.id,
                    value: insertedOptions[idx].id,
                }));

            if (answerValues.length > 0) {
                await db.insert(answer).values(answerValues);
            }
        }

        // Clear draft, publish quiz
        await db
            .update(conversation)
            .set({ draft: null })
            .where(eq(conversation.id, convId));

        await db
            .update(quiz)
            .set({ status: "published" })
            .where(eq(quiz.id, quizId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to approve quiz:", error);
        return NextResponse.json(
            { message: "Failed to approve quiz" },
            { status: 500 }
        );
    }
}