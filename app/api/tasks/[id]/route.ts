// app/api/tasks/[id]/route.ts
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
        .update(tasks)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(tasks.id, parseInt(id)))
        .returning();

    return NextResponse.json(updated);
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    await db.delete(tasks).where(eq(tasks.id, parseInt(id)));

    return NextResponse.json({ success: true });
}