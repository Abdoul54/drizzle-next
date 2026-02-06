/* eslint-disable @next/next/no-img-element */
// app/(protected)/conversations/[id]/page.tsx
'use client';

import {
    Attachment,
    AttachmentData,
    AttachmentHoverCard,
    AttachmentHoverCardContent,
    AttachmentHoverCardTrigger,
    AttachmentInfo,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
    getAttachmentLabel,
    getMediaCategory,
} from '@/components/ai-elements/attachments';
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
import { ChatPromptInput } from '@/components/chat/chat-prompt-input';
import { Button } from '@/components/ui/button';
import { useGetConversation } from '@/hooks/queries/use-conversation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { ArrowLeft, GlobeIcon } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Component to display attachments in the prompt input
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

// Component to render file attachments in messages
const MessageAttachments = ({ attachments }: { attachments: AttachmentData[] }) => {
    if (!attachments || attachments.length === 0) return null;

    console.log({ attachments });

    return (
        <Attachments variant="inline">
            {attachments?.map((attachment, index) => {
                const mediaCategory = getMediaCategory(attachment);
                const label = getAttachmentLabel(attachment);

                return (
                    <AttachmentHoverCard key={index}>
                        <AttachmentHoverCardTrigger asChild>
                            <Attachment data={attachment}>
                                <div className="relative size-5 shrink-0">
                                    <div className="absolute inset-0 transition-opacity group-hover:opacity-0">
                                        <AttachmentPreview />
                                    </div>
                                </div>
                                <AttachmentInfo />
                            </Attachment>
                        </AttachmentHoverCardTrigger>
                        <AttachmentHoverCardContent>
                            <div className="space-y-3">
                                {mediaCategory === 'image' &&
                                    attachment.type === 'file' &&
                                    attachment.url && (
                                        <div className="flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border">
                                            <img
                                                alt={label}
                                                className="max-h-full max-w-full object-contain"
                                                height={384}
                                                src={attachment.url}
                                                width={320}
                                            />
                                        </div>
                                    )}
                                <div className="space-y-1 px-0.5">
                                    <h4 className="font-semibold text-sm leading-none">
                                        {label}
                                    </h4>
                                    {attachment.mediaType && (
                                        <p className="font-mono text-muted-foreground text-xs">
                                            {attachment.mediaType}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </AttachmentHoverCardContent>
                    </AttachmentHoverCard>
                );
            })}
        </Attachments>

    );
};

export default function Page() {
    const { id } = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');

    // Track if we've triggered the initial AI response
    const hasTriggeredInitialResponse = useRef(false);

    // Check if this is a new conversation that needs AI response
    const needsResponse = searchParams.get('new') === 'true';

    // Fetch conversation with messages and quiz data
    const { data: conversation, error, isLoading } = useGetConversation(id as string);

    const conversationId = conversation?.id;
    const quizId = conversation?.quizId;
    const quizData = conversation?.quiz;
    const initialMessages = conversation?.messages ?? [];

    // Setup AI chat with initial messages from DB
    const { messages, sendMessage, status, regenerate, stop } = useChat({
        id: conversationId?.toString(),
        transport: new DefaultChatTransport({
            api: '/api/v2/chat',
            body: { conversationId, quizId }
        }),
        // Pass initial messages - they already have the correct UIMessage format
        messages: (error || isLoading) ? [] : initialMessages as unknown as UIMessage[],
    });

    // Trigger AI response for new conversations with initial message
    useEffect(() => {
        if (
            !isLoading &&
            !error &&
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
    }, [isLoading, error, conversationId, needsResponse, initialMessages.length, messages, regenerate, status, router, id]);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim() || (message.files && message.files.length > 0)) {
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

    // Extract file parts from message parts
    const getFileParts = (parts: unknown[]) => {
        if (!parts) return [];
        return parts.filter((part: unknown) => {
            const p = part as { type?: string };
            return p.type === 'file';
        }) as Array<{ type: string; url: string; mediaType: string; filename: string }>;
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
                            {messages.map((message) => {
                                const fileParts = getFileParts(message.parts as unknown[]);
                                const hasFiles = fileParts.length > 0;

                                return (
                                    <div key={message.id}>
                                        {/* Render file attachments first (for user messages) */}
                                        {message.role === 'user' && hasFiles && (
                                            <Message from={message.role}>
                                                <MessageContent className='p-0 !bg-transparent'>
                                                    <MessageAttachments attachments={fileParts as AttachmentData[]} />
                                                </MessageContent>
                                            </Message>
                                        )}

                                        {/* Render other parts */}
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
                                                            isStreaming={
                                                                status === 'streaming' &&
                                                                i === message.parts!.length - 1 &&
                                                                message.id === messages.at(-1)?.id
                                                            }
                                                        >
                                                            <ReasoningTrigger />
                                                            <ReasoningContent>{part.text}</ReasoningContent>
                                                        </Reasoning>
                                                    );
                                                case 'file':
                                                    // Files are rendered separately above
                                                    return null;
                                                default:
                                                    return null;
                                            }
                                        })}
                                    </div>
                                );
                            })}

                            {/* Streaming indicator */}
                            {status === 'streaming' && messages.at(-1)?.role !== 'assistant' && (
                                <Message from="assistant">
                                    <MessageContent>
                                        <Shimmer className="h-4 w-32" >Streaming</Shimmer>
                                    </MessageContent>
                                </Message>
                            )}
                        </ConversationContent>
                    )}
                    <ConversationScrollButton />
                </Conversation>

                {/* Input Area */}
                <div className="p-4 border-t">
                    <ChatPromptInput
                        onSubmit={handleSubmit}
                        onStop={stop}
                        status={status}
                        placeholder="Describe what kind of quiz you want to create..."
                    />
                </div>
            </div>
        </div>
    );
}