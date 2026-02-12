// lib/localized.ts

import type { LocalizedString } from "@/types/quiz";

/**
 * Resolve a LocalizedString to a plain string for the given locale.
 *
 * Fallback order:
 *  1. Exact match (e.g. "ar")
 *  2. First available key
 *  3. Empty string
 */
export function t(value: LocalizedString | undefined, locale: string): string {
    if (!value) return "";
    return value[locale] ?? Object.values(value)[0] ?? "";
}