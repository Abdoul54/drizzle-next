// app/api/tasks/route.ts
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

export async function GET() {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userId, user.id))
        .orderBy(desc(tasks.createdAt));

    return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const [newTask] = await db
        .insert(tasks)
        .values({
            id: crypto.randomUUID(),
            ...body,
            userId: user.id,
        })
        .returning();

    return NextResponse.json(newTask);
}
