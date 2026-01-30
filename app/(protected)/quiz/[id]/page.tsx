'use client';

import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageAction, MessageActions, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { useConversationByQuizId } from '@/hooks/queries/use-conversations';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { CopyIcon, GlobeIcon, RefreshCcwIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

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
    const { id } = useParams()
    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');

    const { data: conversation, error, isLoading } = useConversationByQuizId(id as string)

    const initialMessages = conversation?.messages ? conversation?.messages : []

    const { messages, sendMessage, status, regenerate } = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat'
        }),
        messages: (error || isLoading) ? [] : initialMessages as unknown as UIMessage[]
    });


    useEffect(() => {
        if (!isLoading && !error && conversation?.messages?.length === 0) {
            const { quiz } = conversation;

            sendMessage({
                text: `
# Create a Quiz

**Title:** ${quiz?.title}
\n**Category:** ${quiz?.category}
\n**Allowed question types:** ${quiz?.types.join(", ")}

Generate a set of questions following these constraints.
`
            });
        }
    }, [sendMessage, conversation, isLoading, error]);


    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
            sendMessage({ text: message.text, files: message.files });
            setInput('');
        }
    };


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