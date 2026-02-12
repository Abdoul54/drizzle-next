// app/api/v1/conversations/[id]/draft/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { conversation } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * GET /api/v1/conversations/[id]/draft
 * Returns the current draft for a conversation
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

    const [conv] = await db
        .select({ draft: conversation.draft })
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

    return NextResponse.json({ draft: conv.draft });
}