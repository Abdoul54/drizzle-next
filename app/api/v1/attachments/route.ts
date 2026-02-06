import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { attachment, conversation, quiz } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-session";
import { uploadFile, generateAttachmentKey } from "@/lib/storage";

const querySchema = z.object({
    quizId: z.coerce.number().int().positive(),
    conversationId: z.coerce.number().int().positive().optional(),
});

const uploadSchema = z.object({
    quizId: z.coerce.number().int().positive(),
    conversationId: z.coerce.number().int().positive().optional(),
    content: z.string().optional(),
});

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
        quizId: url.searchParams.get("quizId"),
        conversationId: url.searchParams.get("conversationId"),
    });

    if (!parsed.success) {
        return NextResponse.json(
            { message: "Invalid query parameters" },
            { status: 400 }
        );
    }

    const [quizRow] = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, parsed.data.quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizRow) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    const attachments = await db
        .select()
        .from(attachment)
        .where(
            and(
                eq(attachment.quizId, parsed.data.quizId),
                parsed.data.conversationId
                    ? or(
                        eq(
                            attachment.conversationId,
                            parsed.data.conversationId
                        ),
                        isNull(attachment.conversationId)
                    )
                    : isNull(attachment.conversationId)
            )
        );

    return NextResponse.json({ attachments });
}

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const quizId = formData.get("quizId");
    const conversationId = formData.get("conversationId");
    const content = formData.get("content");

    const parsed = uploadSchema.safeParse({
        quizId,
        conversationId,
        content: typeof content === "string" ? content : undefined,
    });

    if (!parsed.success || !(file instanceof File)) {
        return NextResponse.json(
            { message: "Invalid upload payload" },
            { status: 400 }
        );
    }

    const [quizRow] = await db
        .select({ id: quiz.id })
        .from(quiz)
        .where(and(eq(quiz.id, parsed.data.quizId), eq(quiz.createdBy, user.id)))
        .limit(1);

    if (!quizRow) {
        return NextResponse.json({ message: "Quiz not found" }, { status: 404 });
    }

    let conversationRow = null;
    if (parsed.data.conversationId) {
        const [found] = await db
            .select({ id: conversation.id })
            .from(conversation)
            .where(
                and(
                    eq(conversation.id, parsed.data.conversationId),
                    eq(conversation.quizId, parsed.data.quizId),
                    eq(conversation.userId, user.id)
                )
            )
            .limit(1);
        if (!found) {
            return NextResponse.json(
                { message: "Conversation not found" },
                { status: 404 }
            );
        }
        conversationRow = found;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageKey = generateAttachmentKey(
        String(parsed.data.quizId),
        file.name,
        parsed.data.conversationId
            ? String(parsed.data.conversationId)
            : undefined,
        false
    );

    const uploadResult = await uploadFile(
        storageKey,
        buffer,
        file.type || "application/octet-stream"
    );

    const [created] = await db
        .insert(attachment)
        .values({
            quizId: parsed.data.quizId,
            conversationId: conversationRow?.id ?? null,
            filename: file.name,
            storageKey: uploadResult.key,
            url: uploadResult.url,
            contentType: file.type || null,
            size: file.size,
            content: parsed.data.content ?? null,
        })
        .returning();

    return NextResponse.json({ attachment: created }, { status: 201 });
}