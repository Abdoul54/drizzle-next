// app/api/conversations/[id]/messages/route.ts
import { db } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { eq, and, asc } from "drizzle-orm";
import { nanoid } from "nanoid";
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

    // Verify the conversation belongs to the user
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

    return NextResponse.json(conversationMessages);
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the conversation belongs to the user
    const conversation = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, id), eq(conversations.userId, user.id)))
        .limit(1);

    if (!conversation.length) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const [newMessage] = await db
        .insert(messages)
        .values({
            id: nanoid(),
            conversationId: id,
            role: body.role,
            content: body.content,
        })
        .returning();

    // Update conversation's updatedAt timestamp
    await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, id));

    return NextResponse.json(newMessage, { status: 201 });
}