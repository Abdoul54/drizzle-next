// app/api/v1/chat/route.ts
import { getCurrentUser } from "@/lib/auth-session";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, generateId, stepCountIs } from "ai";
import { buildRagContext } from "@/lib/rag";
import { convertTextFilesToContent } from "@/lib/message-converter";
import {
    saveUserMessage,
    saveAssistantMessage,
    extractQueryText,
    parseId,
} from "@/lib/chat-persistence";
import { generateQuiz } from "@/lib/tools";
import { languageCodes } from "@/utils/languages";


export const maxDuration = 30;

export async function POST(req: Request) {
    const user = await getCurrentUser();

    if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
        });
    }

    const { messages, conversationId, quizId } = await req.json();
    const convId = parseId(conversationId);
    const qzId = parseId(quizId) ?? undefined;

    if (convId) {
        await saveUserMessage(messages, convId);
    }

    const processedMessages = await convertTextFilesToContent(messages);
    const queryText = extractQueryText(processedMessages);

    const { context: contextBlock } = queryText
        ? await buildRagContext({ query: queryText, quizId: qzId, conversationId: convId })
        : { context: "No user query available." };

    const assistantMessageId = generateId();

    try {
        const result = streamText({
            model: openai(process.env.OPENAI_MODEL || "gpt-4o-mini"),
            system: `You are a professional AI quiz generator.

========================
USER INFORMATION
========================
- User name: ${user?.name}
- User speaks: English
- Quiz id: ${quizId}
- Conversation id: ${conversationId}
- Supported languages: ${languageCodes.join(", ")}

========================
CONTEXT FROM DOCUMENTS
========================
${contextBlock}

This context comes from files the user uploaded to this quiz.
If the user asks about documents, PDFs, or content:
- Use ONLY this context
- Be precise
- Reference key facts from it

========================
QUIZ GENERATION BEHAVIOR
========================
You generate quizzes and save them using a tool.

When the user asks to:
- create quiz
- generate questions
- make exam
- make test
- add questions

You MUST call the generateQuiz tool.

NEVER output quiz questions in assistant text.
ALWAYS use the tool.

The quiz should:
- match user request
- be clear and well written
- have correct answers
- be logically structured

========================
LANGUAGE RULES (CRITICAL)
========================
Generate quiz ONLY in the language the user is speaking.

Default:
- If user speaks English → generate ONLY English
- Do NOT include other languages
- Do NOT auto translate

If user explicitly asks:
"add french"
"make arabic version"
"add multiple languages"

THEN include those languages.

Otherwise → ONE language only.

========================
TOOL FORMAT (VERY IMPORTANT)
========================
When calling generateQuiz tool you MUST use this exact structure:

{
  "conversationId": number,
  "questions": [
    {
      "type": "choice",
      "text": { "en": "Question text here" },
      "subText": { "en": "Optional hint here" },
      "options": [
        { "en": "Option 1" },
        { "en": "Option 2" },
        { "en": "Option 3" },
        { "en": "Option 4" }
      ],
      "correctOptionIndexes": [0]
    }
  ]
}

STRICT RULES:
- NEVER use field "question"
- ALWAYS use "text"
- text MUST be an object with language keys
- options MUST be array of objects with language keys
- Even for ONE language → still object format
- correctOptionIndexes must match correct answers
- NEVER output quiz in assistant text
- ALWAYS call generateQuiz tool

========================
GENERAL BEHAVIOR
========================
Be intelligent and helpful.
Be concise.
Do not explain tool usage to the user.
Just call the tool when quiz generation is requested.
`,
            messages: await convertToModelMessages(processedMessages),
            tools: {
                generateQuiz
            },
            stopWhen: stepCountIs(10),
            onError: async ({ error }) => {
                console.log(error)
            },
            onFinish: async ({ text, steps }) => {
                if (!convId) return;
                try {
                    await saveAssistantMessage({
                        id: assistantMessageId,
                        conversationId: convId,
                        text,
                        steps,
                    });
                } catch (error) {
                    console.error("Failed to save assistant message:", error);
                }
            },
        });

        return result.toUIMessageStreamResponse();
    } catch (error) {
        console.error('Detailed stream error:', error);
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error',
                details: error
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}