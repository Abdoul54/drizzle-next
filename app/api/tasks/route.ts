// app/api/tasks/route.ts
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

export async function GET() {
    const allTasks = await db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt));

    return NextResponse.json(allTasks);
}

export async function POST(request: Request) {
    const body = await request.json();

    const [newTask] = await db
        .insert(tasks)
        .values({
            ...body,
            createdAt: new Date(),
            updatedAt: new Date(),
        })
        .returning();

    return NextResponse.json(newTask);
}