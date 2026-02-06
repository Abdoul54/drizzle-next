import { getCurrentUser } from "@/lib/auth-session";
import { retrieveAttachmentsTool, saveQuizTool } from "@/lib/tools";
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs, smoothStream } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { messages, quizId } = await req.json();

    const result = streamText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
        stopWhen: stepCountIs(10),
        system: `
You are a quiz generator.

Information:
- User's name is ${user?.name}
- User speaks english
- QuizId: ${quizId ?? "unknown"}

If asked to generate quiz questions, use the following schema and keep questions concise:
- multiple_choice: { type, question, options (2-6), correctAnswer }
- true_false: { type, question, correctAnswer (true/false) }
- short_answer: { type, question, correctAnswer (optional) }
- fill_in_blank: { type, question, correctAnswer }

When you finish generating questions, call the tool "save_quiz_questions" with the quizId and questions array (only if QuizId is provided).
If the user provided files, call "retrieve_attachments" to use their content.

You can use the web search tool.

`
        ,
        providerOptions: {
            openai: {
                reasoningEffort: 'low',
            },
        },
        messages: await convertToModelMessages(messages),
        tools: {
            web_search: openai.tools.webSearch({
                // optional configuration:
                externalWebAccess: true,
                searchContextSize: 'high',
            }),
            retrieve_attachments: retrieveAttachmentsTool,
            save_quiz_questions: saveQuizTool,
        },
        experimental_transform: smoothStream({
            chunking: "word",
            delayInMs: 300
        }),
        toolChoice: "auto",
        onStepFinish: ({ toolCalls, toolResults }) => {
            console.log('Step finished:', { toolCalls, toolResults });
        },
        onError: (error) => {
            console.error('Stream error:', error);
        },
        onFinish: ({ usage }) => {
            const { inputTokens, inputTokenDetails, outputTokens, outputTokenDetails, totalTokens } = usage;

            console.log('Usage:', usage);
            console.log('Input tokens:', inputTokens);
            console.log('Input tokens details:', inputTokenDetails);
            console.log('Output tokens:', outputTokens);
            console.log('Output tokens details:', outputTokenDetails);
            console.log('Total tokens:', totalTokens);
        },
    });

    return result.toUIMessageStreamResponse({
        sendFinish: true,
        sendSources: true,
        sendReasoning: true,
        sendStart: true
    });
}
