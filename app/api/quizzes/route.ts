import { db } from "@/db";
import { quizzes, conversations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
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
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();

        const quizId = nanoid();
        const conversationId = nanoid();

        // Create both quiz and conversation in a transaction
        const result = await db.transaction(async (tx) => {
            const [newQuiz] = await tx
                .insert(quizzes)
                .values({
                    id: quizId,
                    title: body.title,
                    description: body.description,
                    category: body.category,
                    types: body.types,
                })
                .returning();

            const [newConversation] = await tx
                .insert(conversations)
                .values({
                    id: conversationId,
                    title: body.title, // Use quiz title as conversation title
                    userId: user.id,
                    quizId: quizId,
                })
                .returning();

            return { quiz: newQuiz, conversation: newConversation };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Failed to create quiz:", error);
        return NextResponse.json(
            { error: "Failed to create quiz" },
            { status: 500 }
        );
    }
}