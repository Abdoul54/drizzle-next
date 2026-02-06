'use client';

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
} from '@/components/ai-elements/prompt-input';
import { GlobeIcon } from 'lucide-react';
import { useState } from 'react';
import { PromptAttachmentsDisplay } from './prompt-attachments-display';
import type { ChatStatus } from 'ai';

// File types supported by OpenAI
const ACCEPTED_FILE_TYPES = 'application/pdf,image/jpeg,image/png,image/gif,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface ChatPromptInputProps {
    onSubmit: (message: PromptInputMessage) => void;
    onStop: () => void;
    placeholder?: string;
    status?: ChatStatus;
    className?: string;
}

export const ChatPromptInput = ({
    onSubmit,
    onStop,
    status,
    placeholder,
    className,
}: ChatPromptInputProps) => {
    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim() || (message.files && message.files.length > 0)) {
            onSubmit(message);
            setInput('');
        }
    };

    return (
        <PromptInput
            onSubmit={handleSubmit}
            className={className}
            globalDrop
            multiple
            accept={ACCEPTED_FILE_TYPES}
        >
            <PromptInputHeader>
                <PromptAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
                <PromptInputTextarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={placeholder || "What's on your mind today"}
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
                <PromptInputSubmit disabled={!input.trim() && status !== 'streaming'} onStop={onStop} status={status} />
            </PromptInputFooter>
        </PromptInput>
    );
};
