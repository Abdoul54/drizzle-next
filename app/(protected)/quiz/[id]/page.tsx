'use client';

import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import ChatError from '@/components/chat-error';
import ChatSkeleton from '@/components/chat-skeleton';
import { useConversationByQuizId } from '@/hooks/queries/use-conversations';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { GlobeIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
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
    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');
    const initialMessageSentRef = useRef(false);

    const { data: conversation, error, isLoading } = useConversationByQuizId(id as string);

    const conversationId = conversation?.id;
    const initialMessages = conversation?.messages ?? [];

    const { messages, sendMessage, status } = useChat({
        id: conversationId, // Use conversationId as chat id
        transport: new DefaultChatTransport({
            api: '/api/chat',
            body: {
                conversationId
            }
        }),
        messages: (error || isLoading) ? [] : initialMessages as unknown as UIMessage[],
    });
    // Send initial quiz generation message
    useEffect(() => {
        if (
            !isLoading &&
            !error &&
            conversation &&
            conversation.messages?.length === 0 &&
            conversation.quiz &&
            conversationId &&
            !initialMessageSentRef.current
        ) {
            initialMessageSentRef.current = true;
            const { quiz } = conversation;

            const initialPrompt = `# Create a Quiz

**Title:** ${quiz.title}
**Category:** ${quiz.category}
**Allowed question types:** ${quiz.types.join(", ")}

Generate a set of questions following these constraints.`;

            sendMessage({ text: initialPrompt });
        }
    }, [isLoading, error, conversation, conversationId, sendMessage]);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
            sendMessage({ text: message.text, files: message.files });
            setInput('');
        }
    };


    return (
        <div className="flex flex-row h-[calc(100vh-6rem)]">
            <div className="flex flex-col h-full w-full">
                <Conversation className="flex-1 overflow-hidden px-4">
                    {isLoading ?
                        <ConversationContent>
                            <ChatSkeleton />
                        </ConversationContent>
                        : error ?
                            <ChatError error={error?.message} />
                            :
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
                    }
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