// app/api/conversations/[id]/messages/[messageId]/route.ts
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; messageId: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, messageId } = await params;

    // Verify the conversation belongs to the user
    const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
        .limit(1);

    if (!conversation.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [deleted] = await db
        .delete(messages)
        .where(and(eq(messages.id, messageId), eq(messages.conversationId, id)))
        .returning();

    if (!deleted) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}