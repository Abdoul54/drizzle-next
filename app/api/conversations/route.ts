// app/api/conversations/route.ts
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await getCurrentUser();
    

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.userId, user.id))
        .orderBy(desc(conversations.updatedAt));

    return NextResponse.json(allConversations);
}