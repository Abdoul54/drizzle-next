// lib/ollama.ts
import { createMistral } from '@ai-sdk/mistral';

export const ollama = createMistral({
    apiKey: process.env.MISTRAL_API_KEY
});