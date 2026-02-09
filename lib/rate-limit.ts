// lib/rate-limit.ts

import { LRUCache } from 'lru-cache';

interface RateLimiterOptions {
    uniqueTokenPerInterval?: number;
    interval?: number;
    maxRequests?: number;
}

/**
 * Rate limiter using LRU cache
 * Default: 10 requests per 60 seconds per user
 */
export class RateLimiter {
    private cache: LRUCache<string, number[]>;
    private interval: number;
    private maxRequests: number;

    constructor(options: RateLimiterOptions = {}) {
        this.interval = options.interval ?? 60000; // 60 seconds default
        this.maxRequests = options.maxRequests ?? 10; // 10 requests default

        this.cache = new LRUCache({
            max: options.uniqueTokenPerInterval ?? 500,
            ttl: this.interval,
        });
    }

    /**
     * Check if request is allowed for the given identifier
     * @param identifier - Unique identifier (user ID, IP address, etc.)
     * @returns Object with allowed status and remaining requests
     */
    check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
        const now = Date.now();
        const tokenKey = `${identifier}`;
        const timestamps = this.cache.get(tokenKey) || [];

        // Remove timestamps outside the current window
        const validTimestamps = timestamps.filter(
            (timestamp) => now - timestamp < this.interval
        );

        const allowed = validTimestamps.length < this.maxRequests;
        const remaining = Math.max(0, this.maxRequests - validTimestamps.length - 1);
        const resetAt = validTimestamps.length > 0
            ? validTimestamps[0] + this.interval
            : now + this.interval;

        if (allowed) {
            validTimestamps.push(now);
            this.cache.set(tokenKey, validTimestamps);
        }

        return {
            allowed,
            remaining: allowed ? remaining : 0,
            resetAt,
        };
    }

    /**
     * Reset rate limit for a specific identifier
     */
    reset(identifier: string): void {
        this.cache.delete(`${identifier}`);
    }
}

// Create singleton instances for different rate limit tiers
export const chatRateLimiter = new RateLimiter({
    maxRequests: 20,  // 20 messages
    interval: 60000,  // per minute
    uniqueTokenPerInterval: 500,
});

export const fileUploadRateLimiter = new RateLimiter({
    maxRequests: 10,  // 10 uploads
    interval: 60000,  // per minute
    uniqueTokenPerInterval: 500,
});

/**
 * Middleware helper for rate limiting
 */
export function withRateLimit(
    rateLimiter: RateLimiter,
    identifier: string
): { success: true } | { success: false; error: string; headers: Record<string, string> } {
    const { allowed, remaining, resetAt } = rateLimiter.check(identifier);

    if (!allowed) {
        return {
            success: false,
            error: 'Rate limit exceeded',
            headers: {
                'X-RateLimit-Limit': rateLimiter['maxRequests'].toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(resetAt).toISOString(),
                'Retry-After': Math.ceil((resetAt - Date.now()) / 1000).toString(),
            },
        };
    }

    return { success: true };
}