import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation, message, quiz } from "@/db/schema";
import { and, eq, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * GET /api/v1/conversations/[id]
 * Get a single conversation with its messages and associated quiz
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
    const conversationId = Number(id);

    if (Number.isNaN(conversationId)) {
        return NextResponse.json(
            { message: "Invalid conversation id" },
            { status: 400 }
        );
    }

    // Get the conversation and verify ownership
    const [conv] = await db
        .select()
        .from(conversation)
        .where(
            and(
                eq(conversation.id, conversationId),
                eq(conversation.userId, user.id)
            )
        )
        .limit(1);

    if (!conv) {
        return NextResponse.json(
            { message: "Conversation not found" },
            { status: 404 }
        );
    }

    // Get the associated quiz
    const [quizData] = await db
        .select()
        .from(quiz)
        .where(eq(quiz.id, conv.quizId))
        .limit(1);

    // Get all messages for this conversation
    const messages = await db
        .select()
        .from(message)
        .where(eq(message.conversationId, conversationId))
        .orderBy(asc(message.createdAt));

    return NextResponse.json({
        ...conv,
        quiz: quizData || null,
        messages,
    });
}

/**
 * DELETE /api/v1/conversations/[id]
 * Delete a conversation and all its messages
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
    const conversationId = Number(id);

    if (Number.isNaN(conversationId)) {
        return NextResponse.json(
            { message: "Invalid conversation id" },
            { status: 400 }
        );
    }

    // Delete the conversation (messages will cascade delete due to FK)
    const [deleted] = await db
        .delete(conversation)
        .where(
            and(
                eq(conversation.id, conversationId),
                eq(conversation.userId, user.id)
            )
        )
        .returning({ id: conversation.id });

    if (!deleted) {
        return NextResponse.json(
            { message: "Conversation not found" },
            { status: 404 }
        );
    }

    return NextResponse.json({ success: true });
}