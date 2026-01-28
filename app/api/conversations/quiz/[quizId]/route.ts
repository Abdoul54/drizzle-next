// app/api/conversations/quiz/[quizId]/route.ts
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ quizId: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.quizId, quizId), eq(conversations.userId, user.id)))
        .limit(1);

    if (!conversation.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation[0].id))
        .orderBy(asc(messages.createdAt));

    return NextResponse.json({
        ...conversation[0],
        messages: conversationMessages,
    });
}