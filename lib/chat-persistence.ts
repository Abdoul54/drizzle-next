/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from "@/db";
import { message as messageTable } from "@/db/schema";
import type { UIMessage } from "ai";

/**
 * Save the latest user message (idempotent — skips if already exists).
 */
export async function saveUserMessage(
    messages: UIMessage[],
    conversationId: number
) {
    const latest = [...messages]
        .reverse()
        .find((m) => m.role === "user");

    if (!latest) return;

    await db
        .insert(messageTable)
        .values({
            id: latest.id,
            conversationId,
            role: latest.role,
            parts: latest.parts ?? [],
            metadata: (latest.metadata as Record<string, unknown>) ?? null,
        })
        .onConflictDoNothing({ target: messageTable.id });
}

/**
 * Build UIMessage-compatible parts from streamText's onFinish data
 * and persist the assistant message.
 */
export async function saveAssistantMessage({
    id,
    conversationId,
    text,
    // steps,
    sources,
}: {
    id: string;
    conversationId: number;
    text: string;
    // steps: any[];
    sources?: any[];
}) {
    const parts: any[] = [];

    // Tool invocations from steps
    // for (const step of steps) {
    //     for (const toolCall of step.toolCalls ?? []) {
    //         const toolResult = step.toolResults?.find(
    //             (r: any) => r.toolCallId === toolCall.toolCallId
    //         );
    //         parts.push({
    //             type: "tool-invocation",
    //             toolName: toolCall.toolName,
    //             toolCallId: toolCall.toolCallId,
    //             state: toolResult ? "result" : "call",
    //             args: toolCall.input,
    //             ...(toolResult ? { output: toolResult.output } : {}),
    //         });
    //     }
    // }

    if (text) {
        parts.push({ type: "text", text });
    }

    for (const source of sources ?? []) {
        parts.push({ type: "source", source });
    }

    await db.insert(messageTable).values({
        id,
        conversationId,
        role: "assistant",
        parts,
        metadata: null,
    });
}

/**
 * Extract plain text from the latest user message parts.
 */
export function extractQueryText(messages: any[]): string {
    const latest = [...messages]
        .reverse()
        .find((m: any) => m.role === "user");

    if (!latest) return "";

    if (Array.isArray(latest.parts)) {
        return latest.parts
            .filter((p: any) => p.type === "text")
            .map((p: any) => p.text || p.content || "")
            .join(" ")
            .trim();
    }

    if (typeof latest.content === "string") return latest.content;
    if (latest.content) return JSON.stringify(latest.content);

    return "";
}

/** Parse a value that may be number or string into a number, or return null. */
export function parseId(value: unknown): number | null {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
        const n = Number(value);
        return Number.isNaN(n) ? null : n;
    }
    return null;
}