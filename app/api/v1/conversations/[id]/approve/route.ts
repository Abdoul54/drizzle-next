// app/api/v1/conversations/[id]/approve/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import {
    conversation,
    quiz,
    quizVersion,
    question,
    option,
    answer
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

type DraftQuestion = {
    text: Record<string, string>;
    type: "single-choice" | "multiple-choice" | "true-false";
    subText?: Record<string, string>;
    media?: string;
    options: Record<string, string>[];
    correctOptionIndexes: number[];
};

type ConversationDraft = {
    questions: DraftQuestion[];
};

/**
 * POST /api/v1/conversations/[id]/approve
 * Creates a new quiz version from the conversation draft
 */
export async function POST(
    req: Request,
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

    try {
        // Get the conversation with its draft
        const [conv] = await db
            .select({
                id: conversation.id,
                quizId: conversation.quizId,
                draft: conversation.draft,
                userId: conversation.userId,
            })
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

        if (!conv.draft) {
            return NextResponse.json(
                { message: "No draft to approve" },
                { status: 400 }
            );
        }

        const draft = conv.draft as ConversationDraft;

        if (!draft.questions || draft.questions.length === 0) {
            return NextResponse.json(
                { message: "Draft has no questions" },
                { status: 400 }
            );
        }

        // Create new version in a transaction
        const result = await db.transaction(async (tx) => {
            // Get the current max version number
            const [maxVersion] = await tx
                .select({ versionNumber: quizVersion.versionNumber })
                .from(quizVersion)
                .where(eq(quizVersion.quizId, conv.quizId))
                .orderBy(desc(quizVersion.versionNumber))
                .limit(1);

            const newVersionNumber = (maxVersion?.versionNumber || 0) + 1;

            // Get quiz details for title/description from active version
            const [quizDetails] = await tx
                .select({
                    title: quizVersion.title,
                    description: quizVersion.description,
                })
                .from(quizVersion)
                .where(
                    and(
                        eq(quizVersion.quizId, conv.quizId),
                        eq(quizVersion.isActive, true)
                    )
                )
                .limit(1);

            // Deactivate current active version
            await tx
                .update(quizVersion)
                .set({ isActive: false })
                .where(
                    and(
                        eq(quizVersion.quizId, conv.quizId),
                        eq(quizVersion.isActive, true)
                    )
                );

            // Create new quiz version
            const [newVersion] = await tx
                .insert(quizVersion)
                .values({
                    quizId: conv.quizId,
                    versionNumber: newVersionNumber,
                    title: quizDetails?.title || { en: "Untitled Quiz" },
                    description: quizDetails?.description || null,
                    status: "draft",
                    isActive: true,
                    createdBy: user.id,
                })
                .returning({
                    id: quizVersion.id,
                    versionNumber: quizVersion.versionNumber,
                });

            // Update quiz activeVersionId
            await tx
                .update(quiz)
                .set({ activeVersionId: newVersion.id })
                .where(eq(quiz.id, conv.quizId));

            // Create questions, options, and answers
            for (const draftQuestion of draft.questions) {
                // Create question
                const [createdQuestion] = await tx
                    .insert(question)
                    .values({
                        quizVersionId: newVersion.id,
                        type: draftQuestion.type,
                        text: draftQuestion.text,
                        subText: draftQuestion.subText || null,
                        media: draftQuestion.media || null,
                    })
                    .returning({ id: question.id });

                // Create options
                const createdOptions = await tx
                    .insert(option)
                    .values(
                        draftQuestion.options.map((opt) => ({
                            questionId: createdQuestion.id,
                            label: opt,
                        }))
                    )
                    .returning({ id: option.id });

                // Create answers (link to correct options)
                const correctOptions = draftQuestion.correctOptionIndexes.map(
                    (idx) => createdOptions[idx].id
                );

                await tx.insert(answer).values(
                    correctOptions.map((optionId) => ({
                        questionId: createdQuestion.id,
                        value: optionId,
                    }))
                );
            }

            // ✅ DRAFT STAYS IN THE CONVERSATION - no clearing here

            return {
                versionId: newVersion.id,
                versionNumber: newVersion.versionNumber,
                questionsCount: draft.questions.length,
                quizId: conv.quizId,
            };
        });

        return NextResponse.json(
            {
                success: true,
                message: "Quiz version created successfully",
                ...result,
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error approving draft:", error);
        return NextResponse.json(
            { message: "Failed to approve draft" },
            { status: 500 }
        );
    }
}
