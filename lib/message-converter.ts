/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/message-converter.ts
import { Buffer } from 'node:buffer';

/**
 * Converts file parts with text-based media types to text parts
 * This prevents errors when AI providers don't support these file types as attachments
 */
export async function convertTextFilesToContent(messages: any[]) {
    const processedMessages = await Promise.all(
        messages.map(async (message) => {
            if (!message.parts || !Array.isArray(message.parts)) {
                return message;
            }

            const processedParts = await Promise.all(
                message.parts.map(async (part: any) => {
                    // Only process file parts with text-based media types
                    if (
                        part.type === 'file' &&
                        part.url &&
                        isTextBasedMediaType(part.mediaType)
                    ) {
                        try {
                            // Extract text from base64 data URL
                            const textContent = await extractTextFromDataUrl(part.url, part.mediaType);

                            // Convert file part to text part
                            return {
                                type: 'text',
                                text: `File "${part.filename || 'unknown'}" content:\n\n${textContent}`,
                            };
                        } catch (error) {
                            console.error(`Failed to extract text from ${part.filename}:`, error);
                            // Keep original part if extraction fails
                            return part;
                        }
                    }

                    // Keep non-text file parts and other parts as-is
                    return part;
                })
            );

            return {
                ...message,
                parts: processedParts,
            };
        })
    );

    return processedMessages;
}

/**
 * Check if a media type is text-based and should be extracted
 */
function isTextBasedMediaType(mediaType: string | undefined): boolean {
    if (!mediaType) return false;

    const textBasedTypes = [
        // Plain text formats
        'text/plain',
        'text/markdown',
        'text/csv',
        'text/html',
        'text/xml',
        'application/json',
        'application/xml',

        // Microsoft Office documents
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls

        // OpenDocument formats
        'application/vnd.oasis.opendocument.text', // .odt
        'application/vnd.oasis.opendocument.spreadsheet', // .ods

        // Rich Text Format
        'application/rtf',
        'text/rtf',
    ];

    return textBasedTypes.some(type => mediaType.toLowerCase().includes(type));
}

/**
 * Extract text content from a data URL
 */
async function extractTextFromDataUrl(dataUrl: string, mediaType: string | undefined): Promise<string> {
    if (!dataUrl.startsWith('data:')) {
        throw new Error('Invalid data URL');
    }

    // Parse data URL: data:[<mediatype>][;base64],<data>
    const matches = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.+)$/);
    if (!matches) {
        throw new Error('Invalid data URL format');
    }

    const [, , isBase64, data] = matches;

    // Simple text formats - just decode
    if (!isBase64) {
        return decodeURIComponent(data);
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(data, 'base64');

    // Handle different file types
    if (mediaType?.includes('wordprocessingml') || mediaType?.includes('msword')) {
        // Word documents (.docx, .doc)
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer }); // works
        return result.value;
    }

    if (mediaType?.includes('spreadsheetml') || mediaType?.includes('ms-excel')) {
        // Excel files (.xlsx, .xls)
        try {
            const ExcelJS = await import('exceljs');
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(buffer as any);

            // Extract text from all sheets
            let allText = '';

            workbook.eachSheet((worksheet, sheetId) => {
                allText += `\n\n=== Sheet: ${worksheet.name} ===\n`;

                // Convert rows to CSV-like format
                worksheet.eachRow((row, rowNumber) => {
                    const values = row.values as any[];
                    // Skip the first undefined element from ExcelJS
                    const rowText = values.slice(1).map(cell => {
                        if (cell === null || cell === undefined) return '';
                        // Handle rich text objects
                        if (typeof cell === 'object' && cell.richText) {
                            return cell.richText.map((rt: any) => rt.text).join('');
                        }
                        return String(cell);
                    }).join(',');
                    allText += rowText + '\n';
                });
            });

            return allText.trim();
        } catch (error) {
            console.error('Failed to parse Excel file:', error);
            throw new Error('Failed to extract text from Excel file');
        }
    }

    if (mediaType?.includes('opendocument')) {
        // OpenDocument formats (.odt, .ods)
        // For now, return a message that these aren't fully supported
        return '[OpenDocument format - text extraction not yet implemented. Consider converting to .docx or .pdf]';
    }

    if (mediaType?.includes('rtf')) {
        // RTF files - basic text extraction (strip RTF commands)
        const text = buffer.toString('utf-8');
        // Very basic RTF stripping - remove control words and groups
        return text
            .replace(/\\[a-z]+(-?\d+)?[ ]?/g, '') // Remove control words
            .replace(/[{}]/g, '') // Remove braces
            .replace(/\\/g, '') // Remove backslashes
            .trim();
    }

    // Default: treat as UTF-8 text
    return buffer.toString('utf-8');
}