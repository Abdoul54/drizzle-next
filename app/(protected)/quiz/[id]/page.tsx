'use client';

import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Reasoning, ReasoningContent, ReasoningTrigger } from '@/components/ai-elements/reasoning';
import { Shimmer } from '@/components/ai-elements/shimmer';
import ChatError from '@/components/chat-error';
import ChatSkeleton from '@/components/chat-skeleton';
import { SelectionPopover } from '@/components/selection-popover';
import { Button } from '@/components/ui/button';
import { useConversationByQuizId } from '@/hooks/queries/use-conversation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { GlobeIcon, Sparkles } from 'lucide-react';
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

    const [additionals, setAdditionals] = useState("")

    // console.log(additionals)

    const askAgent = async (text: string) => {
        setAdditionals(text)
    };

    const conversationId = conversation?.id;
    const initialMessages = conversation?.messages ?? [];

    const [activeTool, setActiveTool] = useState<string | null>(null);

    const { messages, sendMessage, status } = useChat({
        id: conversationId,
        transport: new DefaultChatTransport({
            api: '/api/v1/chat',
            body: { conversationId, quizId: id }
        }),
        messages: (error || isLoading) ? [] : initialMessages as unknown as UIMessage[],

        onToolCall({ toolCall }) {
            setActiveTool(toolCall.toolName);
        },

        onFinish() {
            setActiveTool(null); // Reset when generation completes
        },
    });

    // Derive tool status from state
    const isToolRunning = activeTool !== null && status === 'streaming';

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
`;

            sendMessage({ text: initialPrompt });
        }
    }, [isLoading, error, conversation, conversationId, sendMessage]);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
            sendMessage({ text: message.text, files: message.files });
            setInput('');
        }
    };

    console.log(messages);
    

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
                                <SelectionPopover
                                    renderActions={(text) => (
                                        <Button size="sm" onClick={() => askAgent(text)}>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Ask Agent
                                        </Button>
                                    )}
                                >
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
                                </SelectionPopover>
                                {status === 'submitted' && <Shimmer>Thinking...</Shimmer>}
                                {status === 'streaming' && activeTool && (
                                    <Shimmer>Using Tools...</Shimmer>
                                )}
                                {status === 'streaming' && !activeTool && (
                                    <Shimmer>Generating...</Shimmer>
                                )}
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
