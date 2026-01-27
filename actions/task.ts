"use server";

import { db } from "@/db";
import { tasks } from "@/db/schema";
import { Task } from "@/types/task";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createTask(
    task: Omit<Task, "id" | "createdAt" | "updatedAt">
) {
    const [newTask] = await db.insert(tasks).values({
        ...task,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    revalidatePath("/"); // ✅ correct place

    return newTask;
}

export async function getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
}

export async function updateTask(
    id: number,
    task: Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>
) {
    const [updatedTask] = await db
        .update(tasks)
        .set({
            ...task,
            updatedAt: new Date(),
        })
        .where(eq(tasks.id, id));

    revalidatePath("/");
    return updatedTask;
}

export async function deleteTask(id: number) {
    await db.delete(tasks).where(eq(tasks.id, id));

    revalidatePath("/");
}

export async function changeTaskStatus(id: number, status: Task["status"]) {
    const [updatedTask] = await db
        .update(tasks)
        .set({
            status,
            updatedAt: new Date(),
        })
        .where(eq(tasks.id, id));

    revalidatePath("/");
    return updatedTask;
}
