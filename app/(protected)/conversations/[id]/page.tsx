// app/(protected)/conversations/[id]/page.tsx
'use client';

import { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import ChatError from '@/components/chat-error';
import ChatErrorHandler from '@/components/chat-error-handler';
import ChatSkeleton from '@/components/chat-skeleton';
import { ConversationChat } from '@/components/conversation-chat';
import { Button } from '@/components/ui/button';
import { useGetConversation } from '@/hooks/queries/use-conversation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { ArrowLeft } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

export default function Page() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Track if we've triggered the initial AI response
    const hasTriggeredInitialResponse = useRef(false);

    // Check if this is a new conversation that needs AI response
    const needsResponse = searchParams.get('new') === 'true';

    // Fetch conversation with messages and quiz data
    const { data: conversation, error: conversationError, isLoading } = useGetConversation(id as string);

    const conversationId = conversation?.id;
    const quizId = conversation?.quizId;
    const quizData = conversation?.quiz;
    const initialMessages = conversation?.messages ?? [];

    // Setup AI chat with initial messages from DB
    const { messages, sendMessage, status, error, regenerate, stop } = useChat({
        id: conversationId?.toString(),
        transport: new DefaultChatTransport({
            api: '/api/v1/chat',
            body: { conversationId, quizId },
        }),
        // Pass initial messages - they already have the correct UIMessage format
        messages: (conversationError || isLoading) ? [] : initialMessages as unknown as UIMessage[],
    });

    // Trigger AI response for new conversations with initial message
    useEffect(() => {
        if (
            !isLoading &&
            !conversationError &&
            conversationId &&
            needsResponse &&
            !hasTriggeredInitialResponse.current &&
            initialMessages.length > 0 &&
            messages.length > 0 &&
            status === 'ready'
        ) {
            hasTriggeredInitialResponse.current = true;

            // Check if the last message is from user (needs AI response)
            const lastMessage = messages[messages.length - 1];
            if (lastMessage?.role === 'user') {
                regenerate()
                // Clean up URL
                router.replace(`/conversations/${id}`, { scroll: false });
            }
        }
    }, [isLoading, conversationError, conversationId, needsResponse, initialMessages.length, messages, regenerate, status, router, id]);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim() || (message.files && message.files.length > 0)) {
            sendMessage({ text: message.text, files: message.files });
        }
    };

    // Handle back navigation
    const handleBack = () => {
        if (quizId) {
            router.push(`/quizzes/${quizId}`);
        } else {
            router.back();
        }
    };

    if (status === 'error' && error) {
        return (
            <ChatErrorHandler
                error={error}
                onRetry={() => regenerate()}
            />
        )
    }

    return (
        <div className="flex size-full divide-x">
            {/* Chat Panel */}
            <div className="flex flex-1 flex-col">
                <div className="flex flex-col h-[calc(100vh-6rem)]">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-4 py-3 border-b">
                        <Button variant="ghost" size="icon" onClick={handleBack}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-lg font-semibold truncate">
                                {quizData?.title ?? 'Conversation'}
                            </h1>
                            {quizData?.description && (
                                <p className="text-sm text-muted-foreground truncate">
                                    {quizData.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    {isLoading ? (
                        <div className="flex-1 overflow-hidden px-4">
                            <ChatSkeleton />
                        </div>
                    ) : conversationError ? (
                        <div className="flex-1 overflow-hidden px-4">
                            <ChatError error={conversationError?.message} />
                        </div>
                    ) : (
                        <ConversationChat
                            messages={messages}
                            status={status}
                            onSubmit={handleSubmit}
                            onStop={stop}
                            placeholder="Describe what kind of quiz you want to create..."
                        />
                    )}
                </div>
            </div>

            {/* Preview Panel */}
            <div className="flex flex-1 flex-col">

            </div>
        </div>
    );
}