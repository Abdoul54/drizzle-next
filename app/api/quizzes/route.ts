import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const allQuizzes = await db.select().from(quizzes);
        return NextResponse.json(allQuizzes);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to fetch quizzes" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const newQuiz = await db
            .insert(quizzes)
            .values({
                id: nanoid(),
                title: body.title,
                description: body.description,
                category: body.category,
                types: body.types,
            })
            .returning();

        return NextResponse.json(newQuiz[0], { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to create quiz" },
            { status: 500 }
        );
    }
}