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


interface ChatPromptInputProps {
    onSubmit: (message: PromptInputMessage) => void;
    disabled?: boolean;
    className?: string;
}

export const ChatPromptInput = ({
    onSubmit,
    disabled = false,
    className,
}: ChatPromptInputProps) => {
    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim()) {
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
        >
            <PromptInputHeader>
                <PromptAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
                <PromptInputTextarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder='What quiz you want to make today'
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
                <PromptInputSubmit disabled={disabled || !input.trim()} />
            </PromptInputFooter>
        </PromptInput>
    );
};