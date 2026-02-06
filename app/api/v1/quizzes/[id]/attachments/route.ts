// app/api/v1/quizzes/[id]/attachments/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { attachment, quiz } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";

/**
 * GET /api/v1/quizzes/[id]/attachments
 * Get all attachments for a quiz
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
    const quizId = Number(id);

    if (Number.isNaN(quizId)) {
        return NextResponse.json(
            { message: "Invalid quiz id" },
            { status: 400 }
        );
    }

    // Verify quiz ownership
    const [quizRow] = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizRow) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    // Get quiz-level attachments only (not conversation-specific)
    const attachments = await db
        .select({
            id: attachment.id,
            quizId: attachment.quizId,
            conversationId: attachment.conversationId,
            messageId: attachment.messageId,
            filename: attachment.filename,
            storageKey: attachment.storageKey,
            url: attachment.url,
            mediaType: attachment.mediaType,
            size: attachment.size,
            content: attachment.content,
            createdAt: attachment.createdAt,
            updatedAt: attachment.updatedAt,
        })
        .from(attachment)
        .where(
            and(
                eq(attachment.quizId, quizId),
                isNull(attachment.conversationId)
            )
        )
        .orderBy(attachment.createdAt);

    return NextResponse.json(attachments);
}

/**
 * POST /api/v1/quizzes/[id]/attachments
 * Upload attachments to a quiz with text extraction
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
    const quizId = Number(id);

    if (Number.isNaN(quizId)) {
        return NextResponse.json(
            { message: "Invalid quiz id" },
            { status: 400 }
        );
    }

    // Verify quiz ownership
    const [quizRow] = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizRow) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
        return NextResponse.json(
            { message: "No files provided" },
            { status: 400 }
        );
    }

    const uploadedAttachments = [];

    // Process each file
    for (const file of files) {
        if (!(file instanceof File)) {
            continue;
        }

        let textContent: string | null = null;

        // Extract text based on file type
        try {
            if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                // PDF extraction using unpdf
                const { extractText } = await import('unpdf');
                const arrayBuffer = await file.arrayBuffer();
                const buffer = new Uint8Array(arrayBuffer);
                const result = await extractText(buffer);

                // extractText returns { text: string | string[] }
                if (Array.isArray(result.text)) {
                    textContent = result.text.join('\n\n');
                } else {
                    textContent = result.text;
                }
            } else if (
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                file.name.toLowerCase().endsWith(".docx")
            ) {
                // DOCX extraction using mammoth
                const mammoth = await import('mammoth');
                const arrayBuffer = await file.arrayBuffer();
                const { value } = await mammoth.extractRawText({ arrayBuffer });
                textContent = value;
            } else if (
                file.type === "text/plain" ||
                file.name.toLowerCase().endsWith(".txt") ||
                file.name.toLowerCase().endsWith(".md")
            ) {
                // Plain text
                textContent = await file.text();
            }
        } catch (error) {
            console.error(`Failed to extract text from ${file.name}:`, error);
            // Continue with null content - file will still be saved
        }

        // Save to database with extracted content
        const [created] = await db
            .insert(attachment)
            .values({
                quizId,
                conversationId: null, // Quiz-level attachment
                filename: file.name,
                mediaType: file.type || null,
                size: file.size,
                content: textContent,
            })
            .returning();

        uploadedAttachments.push(created);
    }

    return NextResponse.json(uploadedAttachments, { status: 201 });
}