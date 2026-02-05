'use client';

import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import {
    PromptInput,
    PromptInputActionAddAttachments,
    PromptInputActionMenu,
    PromptInputActionMenuContent,
    PromptInputActionMenuTrigger,
    PromptInputBody,
    PromptInputButton,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputMessage,
    PromptInputSubmit,
    PromptInputTextarea,
    PromptInputTools,
    usePromptInputAttachments
} from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import ChatError from '@/components/chat-error';
import ChatSkeleton from '@/components/chat-skeleton';
import { Button } from '@/components/ui/button';
import { useGetConversation } from '@/hooks/queries/use-conversation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { ArrowLeft, GlobeIcon } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const PromptInputAttachmentsDisplay = () => {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
        return null;
    }

    return (
        <Attachments variant="inline">
            {attachments.files.map((attachment) => (
                <Attachment
                    data={attachment}
                    key={attachment.id}
                    onRemove={() => attachments.remove(attachment.id)}
                >
                    <AttachmentPreview />
                    <AttachmentRemove />
                </Attachment>
            ))}
        </Attachments>
    );
};

export default function Page() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');
    const [activeTool, setActiveTool] = useState<string | null>(null);

    // Track if we've sent the initial message
    const initialMessageSentRef = useRef(false);

    // Get initial message from URL search params
    const initialMessage = searchParams.get('initialMessage');

    // Fetch conversation with messages and quiz data
    const { data: conversation, error, isLoading } = useGetConversation(id as string);

    const conversationId = conversation?.id;
    const quizId = conversation?.quizId;
    const quizData = conversation?.quiz;
    const initialMessages = conversation?.messages ?? [];

    // Setup AI chat
    const { messages, sendMessage, status } = useChat({
        id: conversationId?.toString(),
        transport: new DefaultChatTransport({
            api: '/api/v2/chat',
            body: { conversationId, quizId }
        }),
        messages: (error || isLoading) ? [] : initialMessages as unknown as UIMessage[],

        onToolCall({ toolCall }) {
            setActiveTool(toolCall.toolName);
        },

        onFinish() {
            setActiveTool(null);
        },
    });

    // Auto-send initial message from URL params
    useEffect(() => {
        if (
            !isLoading &&
            !error &&
            conversationId &&
            initialMessage &&
            !initialMessageSentRef.current &&
            messages.length === 0 // Only send if no messages yet
        ) {
            initialMessageSentRef.current = true;

            // Decode and send the initial message
            const decodedMessage = decodeURIComponent(initialMessage);
            sendMessage({ text: decodedMessage });

            // Clean up URL by removing the search param (optional, for cleaner URL)
            router.replace(`/conversations/${id}`, { scroll: false });
        }
    }, [isLoading, error, conversationId, initialMessage, messages.length, sendMessage, router, id]);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
            sendMessage({ text: message.text, files: message.files });
            setInput('');
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

    return (
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
            <div className="flex flex-col flex-1 overflow-hidden">
                <Conversation className="flex-1 overflow-hidden px-4">
                    {isLoading ? (
                        <ConversationContent>
                            <ChatSkeleton />
                        </ConversationContent>
                    ) : error ? (
                        <ChatError error={error?.message} />
                    ) : (
                        <ConversationContent>
                            {messages.map((message) => (
                                <div key={message.id}>
                                    {message.parts?.map((part, i) => {
                                        switch (part.type) {
                                            case 'text':
                                                return (
                                                    <Message key={`${message.id}-${i}`} from={message.role}>
                                                        <MessageContent>
                                                            <MessageResponse>
                                                                {part.text}
                                                            </MessageResponse>
                                                        </MessageContent>
                                                    </Message>
                                                );
                                            case 'reasoning':
                                                return (
                                                    <Reasoning
                                                        key={`${message.id}-${i}`}
                                                        className="w-full"
                                                        isStreaming={status === 'streaming' && i === message.parts!.length - 1 && message.id === messages.at(-1)?.id}
                                                    >
                                                        <ReasoningTrigger />
                                                        <ReasoningContent>{part.text}</ReasoningContent>
                                                    </Reasoning>
                                                );
                                            default:
                                                return null;
                                        }
                                    })}
                                </div>
                            ))}
                            {status === 'submitted' && <Shimmer>Thinking...</Shimmer>}
                            {status === 'streaming' && activeTool && (
                                <Shimmer>Using Tools...</Shimmer>
                            )}
                            {status === 'streaming' && !activeTool && (
                                <Shimmer>Generating...</Shimmer>
                            )}
                        </ConversationContent>
                    )}
                    <ConversationScrollButton />
                </Conversation>

                {/* Input Area */}
                <PromptInput onSubmit={handleSubmit} className="px-4" globalDrop multiple>
                    <PromptInputHeader>
                        <PromptInputAttachmentsDisplay />
                    </PromptInputHeader>
                    <PromptInputBody>
                        <PromptInputTextarea
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                            disabled={isLoading || !!error}
                        />
                    </PromptInputBody>
                    <PromptInputFooter>
                        <PromptInputTools>
                            <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger disabled={isLoading || !!error} />
                                <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments disabled={isLoading || !!error} />
                                </PromptInputActionMenuContent>
                            </PromptInputActionMenu>
                            <PromptInputButton
                                type="button"
                                variant={webSearch ? 'default' : 'ghost'}
                                onClick={() => setWebSearch(!webSearch)}
                                disabled={isLoading || !!error}
                            >
                                <GlobeIcon size={16} />
                                <span>Search</span>
                            </PromptInputButton>
                        </PromptInputTools>
                        <PromptInputSubmit disabled={!input.trim() || status === 'streaming'} />
                    </PromptInputFooter>
                </PromptInput>
            </div>
        </div>
    );
}