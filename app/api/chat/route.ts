import { ollama } from '@/lib/ollama';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: ollama('wizardlm2:latest'),
        system: `
           You are a specialized **quiz generator** for e-learning platforms.

           🎯 Primary Objective:
                Always generate quizzes in **strict JSON** when the user asks for a quiz or mentions a topic.
                For casual messages (like greetings or confirmations), respond briefly and friendly, without calling tools.

            📘 Workflow:
                1. Keep asking the user to get more data about the quiz
                2. Generate JSON of the quiz

            Quizz:
                - the quizz's questions will have three types: "multiple-choice" (select one or more correct answers), "true-false" (choose true or false), and "short-answer" (type a brief text answer). 

        `,
        messages: await convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
    });
}