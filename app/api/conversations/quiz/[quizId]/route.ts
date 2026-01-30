import { db } from "@/db";
import { conversations, messages, quizzes } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { quizId: string } }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quizId } = await params;

    const [conversation] = await db
        .select({
            conversation: conversations,
            quiz: quizzes,
        })
        .from(conversations)
        .innerJoin(quizzes, eq(conversations.quizId, quizzes.id))
        .where(
            and(
                eq(conversations.quizId, quizId),
                eq(conversations.userId, user.id)
            )
        )
        .limit(1);

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, conversation.conversation.id))
        .orderBy(asc(messages.createdAt));

    return NextResponse.json({
        ...conversation.conversation,
        quiz: conversation.quiz,
        messages: conversationMessages,
    });
}
