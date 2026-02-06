// app/api/v1/quizzes/[id]/conversations/route.ts

import { NextResponse } from "next/server";
import { db } from "@/db";
import { quiz, conversation, message, attachment } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth-session";
import { generateId } from "ai";

/**
 * Convert a File to base64 data URL
 */
async function fileToBase64DataUrl(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    return `data:${file.type};base64,${base64}`;
}

/**
 * GET /api/v1/quizzes/[id]/conversations
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

    // Ensure quiz exists AND belongs to user
    const quizExists = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizExists.length) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    const result = await db
        .select()
        .from(conversation)
        .where(
            and(
                eq(conversation.quizId, quizId),
                eq(conversation.userId, user.id)
            )
        )
        .orderBy(conversation.createdAt);

    return NextResponse.json(result);
}


/**
 * POST /api/v1/quizzes/[id]/conversations
 * 
 * Accepts multipart/form-data with:
 * - text: string (optional) - The initial message text
 * - files: File[] (optional) - Attached files (will be converted to base64)
 * 
 * Or JSON with:
 * - text: string (optional)
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

    // Verify quiz exists and belongs to user
    const quizExists = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizExists.length) {
        return NextResponse.json(
            { message: "Quiz not found" },
            { status: 404 }
        );
    }

    // Parse request - handle both FormData and JSON
    let text: string | null = null;
    let files: File[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
        const formData = await req.formData();
        text = formData.get("text") as string | null;
        files = formData.getAll("files") as File[];
    } else {
        try {
            const json = await req.json();
            text = json.text || null;
        } catch {
            // Empty body is fine
        }
    }

    // Create conversation
    const [createdConversation] = await db
        .insert(conversation)
        .values({
            quizId,
            userId: user.id,
        })
        .returning({
            id: conversation.id,
            quizId: conversation.quizId,
            userId: conversation.userId,
            createdAt: conversation.createdAt,
        });

    const conversationId = createdConversation.id;

    // If there's an initial message (text or files), create it
    if (text || files.length > 0) {
        // Generate message ID (AI SDK uses string IDs)
        const messageId = generateId();

        // Build UIMessage parts array
        // Format: { type: "file", url: "data:...", mediaType: "...", filename: "..." }
        const parts: Array<{
            type: string;
            text?: string;
            url?: string;
            mediaType?: string;
            filename?: string;
        }> = [];

        // Track files for attachment table
        const fileMetadata: Array<{
            filename: string;
            url: string;
            mediaType: string;
            size: number;
        }> = [];

        // Process files - convert to base64 data URLs
        if (files.length > 0) {
            for (const file of files) {
                const base64DataUrl = await fileToBase64DataUrl(file);

                // Add FileUIPart to message parts (file parts come before text)
                parts.push({
                    type: "file",
                    url: base64DataUrl,
                    mediaType: file.type,
                    filename: file.name,
                });

                // Track for attachment table
                fileMetadata.push({
                    filename: file.name,
                    url: base64DataUrl,
                    mediaType: file.type,
                    size: file.size,
                });
            }
        }

        // Add text part after files (matching UIMessage format)
        if (text) {
            parts.push({ type: "text", text });
        }

        // Create the message with string ID
        await db.insert(message).values({
            id: messageId,
            conversationId,
            role: "user",
            metadata: {},
            parts,
        });

        // Save attachment records (for querying/management)
        if (fileMetadata.length > 0) {
            await db.insert(attachment).values(
                fileMetadata.map((file) => ({
                    conversationId,
                    messageId,
                    filename: file.filename,
                    url: file.url,
                    content: null, // Could extract text content from PDFs here if needed
                    mediaType: file.mediaType,
                    size: file.size,
                }))
            );
        }
    }

    return NextResponse.json(createdConversation, { status: 201 });
}