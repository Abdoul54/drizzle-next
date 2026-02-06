// app/api/v1/quizzes/[id]/attachments/[attachmentId]/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { attachment, quiz } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * DELETE /api/v1/quizzes/[id]/attachments/[attachmentId]
 * Delete an attachment from a quiz
 */
export async function DELETE(
    _: Request,
    { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id, attachmentId } = await params;
    const quizId = Number(id);
    const attachId = Number(attachmentId);

    if (Number.isNaN(quizId) || Number.isNaN(attachId)) {
        return NextResponse.json(
            { message: "Invalid quiz or attachment id" },
            { status: 400 }
        );
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

    // Get the attachment to verify it exists
    const [attachmentRow] = await db
        .select()
        .from(attachment)
        .where(
            and(
                eq(attachment.id, attachId),
                eq(attachment.quizId, quizId)
            )
        )
        .limit(1);

    if (!attachmentRow) {
        return NextResponse.json(
            { message: "Attachment not found" },
            { status: 404 }
        );
    }

    // Delete from database
    await db
        .delete(attachment)
        .where(eq(attachment.id, attachId));

    return NextResponse.json({ success: true });
}