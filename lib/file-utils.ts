// lib/file-utils.ts

import { extractText } from "unpdf";

/**
 * Extract text content from a file for AI context
 * Supports: PDF, TXT, plain text
 */
export async function extractTextFromFile(file: File): Promise<string | null> {
    const mediaType = file.type;

    // Plain text files
    if (
        mediaType === "text/plain" ||
        mediaType === "text/markdown" ||
        mediaType === "text/csv"
    ) {
        return await file.text();
    }

    // PDF files
    if (mediaType === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const { text } = await extractText(buffer);

        // unpdf returns string[] (one string per page), join them
        if (Array.isArray(text)) {
            return text.join("\n\n");
        }
        return text;
    }

    // Word documents - using mammoth
    if (
        mediaType === "application/msword" ||
        mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    // Unsupported file type
    return null;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Check if file type is supported for text extraction
 */
export function isTextExtractable(mediaType: string): boolean {
    const extractableTypes = [
        "text/plain",
        "text/markdown",
        "text/csv",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    return extractableTypes.includes(mediaType);
}