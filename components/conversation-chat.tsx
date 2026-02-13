// components/conversation-chat.tsx
'use client';

import { QuestionSelection } from '@/app/(protected)/conversations/[id]/page';
import {
    Attachment,
    AttachmentData,
    AttachmentHoverCard,
    AttachmentHoverCardContent,
    AttachmentHoverCardTrigger,
    AttachmentInfo,
    AttachmentPreview,
    Attachments,
    getAttachmentLabel,
    getMediaCategory,
} from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ChatPromptInput } from '@/components/chat/chat-prompt-input';
import { ChatStatus, UIMessage } from 'ai';
import { Item, ItemContent, ItemMedia, ItemTitle } from './ui/item';
import { SquareMousePointer } from 'lucide-react';

interface ConversationChatProps {
    messages: UIMessage[];
    status: ChatStatus;
    onSubmit: (message: PromptInputMessage) => void;
    selectedItem: QuestionSelection
    removeSelection: () => void
    onStop: () => void;
    placeholder?: string;
}

// Component to render file attachments in messages
const MessageAttachments = ({ attachments }: { attachments: AttachmentData[] }) => {
    if (!attachments || attachments.length === 0) return null;

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

// Extract file parts from message parts
const getFileParts = (parts: unknown[]) => {
    if (!parts) return [];
    return parts.filter((part: unknown) => {
        const p = part as { type?: string };
        return p.type === 'file';
    }) as Array<{ type: string; url: string; mediaType: string; filename: string }>;
};

export function ConversationChat({
    messages,
    status,
    onSubmit,
    selectedItem,
    removeSelection,
    onStop,
    placeholder = "Type your message..."
}: ConversationChatProps) {
    return (
        <div className="flex flex-col flex-1 overflow-hidden">
            <Conversation className="flex-1 overflow-hidden px-4">
                <ConversationContent>
                    {messages.map((message) => {
                        const fileParts = getFileParts(message.parts as unknown[]);
                        const hasFiles = fileParts.length > 0;
                        const metadata = message.metadata as { selection?: string } | undefined;
                        const hasSelection = metadata?.selection;

                        return (
                            <div key={message.id}>
                                {/* Render file attachments first (for user messages) */}
                                {message.role === 'user' && hasFiles && (
                                    <Message from={message.role}>
                                        <MessageContent className='p-0 bg-transparent!'>
                                            <MessageAttachments attachments={fileParts as AttachmentData[]} />
                                        </MessageContent>
                                    </Message>
                                )}
                                {message.role === 'user' && hasSelection && (
                                    <Message from={message.role}>
                                        <MessageContent className='p-0 bg-transparent!'>
                                            <Item variant="outline" size="sm" className='w-full bg-info/20 border-info text-info px-2 py-1'>
                                                <ItemMedia>
                                                    <SquareMousePointer className="size-4" />
                                                </ItemMedia>
                                                <ItemContent>
                                                    <ItemTitle>{hasSelection}</ItemTitle>
                                                </ItemContent>
                                            </Item>
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
                                <Shimmer className="h-4 w-32">Streaming</Shimmer>
                            </MessageContent>
                        </Message>
                    )}
                </ConversationContent>
                <ConversationScrollButton />
            </Conversation>

            {/* Input Area */}
            <div className="p-4 border-t">
                <ChatPromptInput
                    onSubmit={onSubmit}
                    onStop={onStop}
                    status={status}
                    selectedItem={selectedItem}
                    removeSelection={removeSelection}
                    placeholder={placeholder}
                />
            </div>
        </div>
    );
}