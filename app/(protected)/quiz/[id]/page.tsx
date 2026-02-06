'use client';

import {
    Attachment,
    AttachmentPreview,
    AttachmentRemove,
    Attachments,
} from '@/components/ai-elements/attachments';
import { Conversation, ConversationContent } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputButton, PromptInputFooter, PromptInputHeader, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '@/components/ai-elements/prompt-input';
import { Reasoning } from '@/components/ai-elements/reasoning';
import ChatError from '@/components/chat-error';
import ChatSkeleton from '@/components/chat-skeleton';
import { SelectionPopover } from '@/components/selection-popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversationByQuizId } from '@/hooks/queries/use-conversation';
import { useGetQuiz } from '@/hooks/queries/use-quiz';
import { axiosInstance } from '@/lib/axios';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';
import { GlobeIcon, Paperclip, Sparkles } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
    const quizId = Array.isArray(id) ? id[0] : id;
    const [webSearch, setWebSearch] = useState(false);
    const [input, setInput] = useState('');
    const initialMessageSentRef = useRef(false);

    const { data: quiz } = useGetQuiz(quizId);
    const { data: conversation, error, isLoading } = useConversationByQuizId(quizId ?? '');
    const [uploadFiles, setUploadFiles] = useState<File[]>([]);
    const queryClient = useQueryClient();

    const { data: attachmentsData, isLoading: isLoadingAttachments } = useQuery({
        queryKey: ['attachments', quizId],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/api/v1/attachments', {
                params: { quizId },
            });
            return data as { attachments: AttachmentRow[] };
        },
        enabled: !!quizId,
    });

    const uploadAttachment = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('quizId', String(quizId));
            const response = await fetch('/api/v1/attachments', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('Failed to upload attachment');
            }
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attachments', quizId] });
        },
    });

    const conversationId = conversation?.id;
    const initialMessages = conversation?.messages ?? [];

    const [activeTool, setActiveTool] = useState<string | null>(null);

    const { messages, sendMessage, status } = useChat({
        id: conversationId,
        transport: new DefaultChatTransport({
            api: '/api/chat',
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

    const handleAskAgent = (text: string) => {
        if (!text.trim()) {
            return;
        }
        sendMessage({ text });
    };

    const attachments = attachmentsData?.attachments ?? [];
    const isUploading = uploadAttachment.isPending;

    const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        setUploadFiles(files);
        event.target.value = '';
    };

    const handleUpload = async () => {
        if (!uploadFiles.length || !quizId) {
            return;
        }
        await Promise.all(uploadFiles.map((file) => uploadAttachment.mutateAsync(file)));
        setUploadFiles([]);
    };

    const attachmentItems = useMemo(
        () =>
            attachments.map((item) => ({
                ...item,
                label: item.filename ?? `Attachment ${item.id}`,
            })),
        [attachments]
    );

    return (
        <div className="flex flex-row h-[calc(100vh-6rem)] gap-6">
            <div className="flex flex-col h-full w-full">
                <div className="px-4 pb-4">
                    <h1 className="text-2xl font-semibold text-foreground">
                        {quiz?.title ?? 'Quiz'}
                    </h1>
                    {quiz?.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                            {quiz.description}
                        </p>
                    )}
                </div>
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
                                        <Button size="sm" onClick={() => handleAskAgent(text)}>
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
                                                                disabled={isLoading || !!error}
                                                            />
                                                        )
                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </div>
                                    ))}
                                </SelectionPopover>
                            </ConversationContent>
                    }
                </Conversation>
                <PromptInputBody>
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
                </PromptInputBody>
            </div>
            <aside className="w-full max-w-sm border-l px-4 py-4 space-y-4">
                <div>
                    <h2 className="text-lg font-semibold">Quiz Attachments</h2>
                    <p className="text-sm text-muted-foreground">
                        Upload files here to make them available to all conversations
                        for this quiz.
                    </p>
                </div>
                <div className="space-y-3">
                    <Input
                        type="file"
                        multiple
                        onChange={handleFilesChange}
                        disabled={isUploading || !quizId}
                    />
                    {uploadFiles.length > 0 && (
                        <div className="space-y-2">
                            {uploadFiles.map((file) => (
                                <div
                                    key={`${file.name}-${file.size}`}
                                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                >
                                    <span className="truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatBytes(file.size)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    <Button
                        onClick={handleUpload}
                        disabled={!uploadFiles.length || isUploading || !quizId}
                        className="w-full"
                    >
                        <Paperclip className="mr-2 h-4 w-4" />
                        {isUploading ? 'Uploading...' : 'Upload attachments'}
                    </Button>
                </div>
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Available attachments</h3>
                    {isLoadingAttachments ? (
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    ) : attachmentItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No attachments uploaded yet.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {attachmentItems.map((item) => (
                                <li
                                    key={item.id}
                                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                                >
                                    <div className="flex flex-col">
                                        <span className="truncate font-medium">
                                            {item.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {item.contentType ?? 'Unknown type'} ·{' '}
                                            {item.size ? formatBytes(item.size) : '—'}
                                        </span>
                                    </div>
                                    {item.url && (
                                        <a
                                            className="text-xs text-primary underline"
                                            href={item.url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            View
                                        </a>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
        </div>
    )
}


type AttachmentRow = {
    id: number;
    filename: string | null;
    url: string | null;
    contentType: string | null;
    size: number | null;
};

function formatBytes(value: number) {
    if (value < 1024) {
        return `${value} B`;
    }
    const kb = value / 1024;
    if (kb < 1024) {
        return `${kb.toFixed(1)} KB`;
    }
    return `${(kb / 1024).toFixed(1)} MB`;
}