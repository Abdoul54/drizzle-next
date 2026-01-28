// app/api/conversations/[id]/route.ts
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { eq, and, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
        .limit(1);

    if (!conversation.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(asc(messages.createdAt));

    return NextResponse.json({
        ...conversation[0],
        messages: conversationMessages,
    });
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
        .update(conversations)
        .set(body)
        .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
        .returning();

    if (!updated) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [deleted] = await db
        .delete(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
        .returning();

    if (!deleted) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}