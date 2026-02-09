// lib/token-budget.ts

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token budget
 */
export function truncateToTokenBudget(text: string, maxTokens: number): {
    text: string;
    originalTokens: number;
    truncatedTokens: number;
    wasTruncated: boolean;
} {
    const originalTokens = estimateTokens(text);

    if (originalTokens <= maxTokens) {
        return {
            text,
            originalTokens,
            truncatedTokens: originalTokens,
            wasTruncated: false,
        };
    }

    // Calculate character limit
    const maxChars = maxTokens * 4;

    // Truncate with ellipsis
    const truncated = text.substring(0, maxChars - 20) + '\n\n[...truncated]';

    return {
        text: truncated,
        originalTokens,
        truncatedTokens: estimateTokens(truncated),
        wasTruncated: true,
    };
}

/**
 * Manage token budget across multiple text chunks
 */
export function distributeTokenBudget(
    chunks: Array<{ id: string | number; text: string; priority?: number }>,
    totalBudget: number
): Array<{ id: string | number; text: string; allocated: number; truncated: boolean }> {
    // Sort by priority (higher first), default priority is 1
    const sorted = [...chunks].sort((a, b) => (b.priority ?? 1) - (a.priority ?? 1));

    const results: Array<{ id: string | number; text: string; allocated: number; truncated: boolean }> = [];
    let remainingBudget = totalBudget;

    for (const chunk of sorted) {
        if (remainingBudget <= 0) {
            // No budget left, skip this chunk
            continue;
        }

        const chunkTokens = estimateTokens(chunk.text);

        if (chunkTokens <= remainingBudget) {
            // Fits entirely
            results.push({
                id: chunk.id,
                text: chunk.text,
                allocated: chunkTokens,
                truncated: false,
            });
            remainingBudget -= chunkTokens;
        } else {
            // Need to truncate
            const { text, truncatedTokens } = truncateToTokenBudget(chunk.text, remainingBudget);
            results.push({
                id: chunk.id,
                text,
                allocated: truncatedTokens,
                truncated: true,
            });
            remainingBudget = 0;
        }
    }

    return results;
}

/**
 * Smart context window management
 * Prioritizes recent messages and high-relevance documents
 */
export interface ContextPart {
    type: 'system' | 'rag' | 'message';
    content: string;
    priority?: number;
    estimatedTokens?: number;
}

export function buildContextWithBudget(
    parts: ContextPart[],
    maxContextTokens: number
): {
    context: string;
    parts: Array<{ type: string; tokens: number; included: boolean }>;
    totalTokens: number;
    budgetExceeded: boolean;
} {
    const systemParts = parts.filter(p => p.type === 'system');
    const ragParts = parts.filter(p => p.type === 'rag');
    const messageParts = parts.filter(p => p.type === 'message');

    // Reserve budget allocation
    const systemBudget = Math.min(2000, maxContextTokens * 0.2); // 20% for system
    const ragBudget = Math.min(4000, maxContextTokens * 0.5);    // 50% for RAG
    const messageBudget = maxContextTokens - systemBudget - ragBudget;

    const result: Array<{ type: string; tokens: number; included: boolean }> = [];
    let totalTokens = 0;
    const contextParts: string[] = [];

    // Process system prompts (highest priority)
    for (const part of systemParts) {
        const tokens = part.estimatedTokens ?? estimateTokens(part.content);
        if (totalTokens + tokens <= systemBudget) {
            contextParts.push(part.content);
            totalTokens += tokens;
            result.push({ type: 'system', tokens, included: true });
        } else {
            result.push({ type: 'system', tokens, included: false });
        }
    }

    // Process RAG context (medium priority)
    const ragChunks = ragParts.map((p, i) => ({
        id: i,
        text: p.content,
        priority: p.priority ?? 1,
    }));
    const distributedRag = distributeTokenBudget(ragChunks, ragBudget);

    for (const chunk of distributedRag) {
        contextParts.push(chunk.text);
        totalTokens += chunk.allocated;
        result.push({
            type: 'rag',
            tokens: chunk.allocated,
            included: true,
        });
    }

    // Process messages (fill remaining budget)
    const messageChunks = messageParts.map((p, i) => ({
        id: i,
        text: p.content,
        priority: p.priority ?? 1,
    }));
    const distributedMessages = distributeTokenBudget(messageChunks, messageBudget);

    for (const chunk of distributedMessages) {
        contextParts.push(chunk.text);
        totalTokens += chunk.allocated;
        result.push({
            type: 'message',
            tokens: chunk.allocated,
            included: true,
        });
    }

    return {
        context: contextParts.join('\n\n'),
        parts: result,
        totalTokens,
        budgetExceeded: totalTokens > maxContextTokens,
    };
}