// lib/tools.ts
import { tool } from 'ai';
import { z } from 'zod';

const quizSchema = z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    questions: z.array(z.object({
        type: z.enum(['multiple_choice', 'true_false', 'short_answer']),
        question: z.string(),
        options: z.array(z.string()).optional(),
        correctAnswer: z.union([z.string(), z.array(z.string())])
    }))
});

export const quizTool = tool({
    description: 'Generate a quiz with structured questions',
    inputSchema: quizSchema,
    execute: async (args) => {
        console.log('Tool executed with:', JSON.stringify(args, null, 2));
        return args;
    },
});