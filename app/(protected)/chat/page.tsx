'use client';

import { Attachment, AttachmentHoverCard, AttachmentHoverCardContent, AttachmentHoverCardTrigger, AttachmentInfo, AttachmentPreview, AttachmentRemove, Attachments, getAttachmentLabel, getMediaCategory } from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
import { useState } from 'react';

const PromptInputAttachmentsDisplay = () => {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
        return null;
    }

    const handleRemove = (id: string) => {
        attachments?.remove(id)
    };


    return (
        <Attachments variant="inline">
            {attachments?.files?.map((attachment) => {
                const mediaCategory = getMediaCategory(attachment);
                const label = getAttachmentLabel(attachment);

                return (
                    <AttachmentHoverCard key={attachment.id}>
                        <AttachmentHoverCardTrigger asChild>
                            <Attachment
                                data={attachment}
                                onRemove={() => handleRemove(attachment.id)}
                            >
                                <div className="relative size-5 shrink-0">
                                    <div className="absolute inset-0 transition-opacity group-hover:opacity-0">
                                        <AttachmentPreview />
                                    </div>
                                    <AttachmentRemove className="absolute inset-0" />
                                </div>
                                <AttachmentInfo />
                            </Attachment>
                        </AttachmentHoverCardTrigger>
                        <AttachmentHoverCardContent>
                            <div className="space-y-3">
                                {mediaCategory === "image" &&
                                    attachment.type === "file" &&
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
    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');


    const { messages, sendMessage, status, regenerate } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/v2/chat',
        }),
    });

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
            sendMessage({ text: message.text, files: message.files });
            setInput('');
        }
    };

    console.log(messages);


    return (
        <div className="flex flex-row h-[calc(100vh-6rem)]">
            {/* Chat Column */}
            <div className="flex flex-col h-full w-full">
                <Conversation className="flex-1 overflow-hidden px-4">
                    <ConversationContent>
                        {messages.map((message, messageIndex) => (
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
                                                    {message.role === 'assistant' && (status !== 'streaming') && messageIndex === messages.length - 1 && (
                                                        <MessageActions>
                                                            <MessageAction
                                                                onClick={() => regenerate()}
                                                                label="Retry"
                                                            >
                                                                <RefreshCcwIcon className="size-3" />
                                                            </MessageAction>
                                                            <MessageAction
                                                                onClick={() => navigator.clipboard.writeText(part.text)}
                                                                label="Copy"
                                                            >
                                                                <CopyIcon className="size-3" />
                                                            </MessageAction>
                                                        </MessageActions>
                                                    )}
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
                        {status === 'submitted' && <Shimmer>Thinking..</Shimmer>}
                    </ConversationContent>
                    <ConversationScrollButton />
                </Conversation>
                <PromptInput onSubmit={handleSubmit} className="px-4" globalDrop multiple>
                    <PromptInputHeader>
                        <PromptInputAttachmentsDisplay />
                    </PromptInputHeader>
                    <PromptInputBody>
                        <PromptInputTextarea
                            onChange={(e) => setInput(e.target.value)}
                            value={input}
                        />
                    </PromptInputBody>
                    <PromptInputFooter>
                        <PromptInputTools>
                            <PromptInputActionMenu>
                                <PromptInputActionMenuTrigger />
                                <PromptInputActionMenuContent>
                                    <PromptInputActionAddAttachments />
                                </PromptInputActionMenuContent>
                            </PromptInputActionMenu>
                            <PromptInputButton
                                type="button"
                                variant={webSearch ? 'default' : 'ghost'}
                                onClick={() => setWebSearch(!webSearch)}
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