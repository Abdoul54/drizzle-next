/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { GlobeIcon, SquareMousePointer, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { PromptAttachmentsDisplay } from './prompt-attachments-display';
import type { ChatStatus } from 'ai';
import { QuestionSelection } from '@/app/(protected)/conversations/[id]/page';
import { Item, ItemContent, ItemMedia, ItemTitle } from '../ui/item';
import { Button } from '../ui/button';

// File types supported by OpenAI
const ACCEPTED_FILE_TYPES = 'application/pdf,application/x-pdf,application/acrobat,application/vnd.pdf,text/pdf,text/x-pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.ms-word,application/doc,application/ms-doc,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/msexcel,application/x-msexcel,application/x-ms-excel,application/x-excel,application/x-dos_ms_excel,application/xls,text/csv,text/comma-separated-values,application/csv,application/x-csv,text/x-csv,text/x-comma-separated-values,text/plain,text/txt,application/txt,application/text,'


interface ChatPromptInputProps {
    onSubmit: (message: PromptInputMessage) => void;
    onStop?: () => void;
    selectedItem?: QuestionSelection
    removeSelection?: () => void
    placeholder?: string;
    status?: ChatStatus;
    className?: string;
}

export const ChatPromptInput = ({
    onSubmit,
    onStop,
    status,
    selectedItem,
    removeSelection,
    placeholder,
    className,
}: ChatPromptInputProps) => {
    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);

    const handleSubmit = (message: PromptInputMessage) => {
        if (message.text?.trim() || (message.files && message.files.length > 0)) {
            onSubmit(message);
            setInput('');
            if (removeSelection)
                removeSelection();
        }
    };

    const selectionLabel = useMemo(() => {
        if (!selectedItem?.selection?.type) return null;

        switch (selectedItem.selection.type) {
            case 'text':
                return `Selected question ${selectedItem.questionIndex + 1} text.`;
            case 'subtext':
                return `Selected hint of question ${selectedItem.questionIndex + 1}.`;
            case 'option':
                return `Selected option of question ${selectedItem.questionIndex + 1}.`;
            default:
                return null;
        }
    }, [selectedItem]);


    return (
        <PromptInput
            onSubmit={handleSubmit}
            className={className}
            globalDrop
            multiple
            accept={ACCEPTED_FILE_TYPES}
        >
            <PromptInputHeader>
                {selectedItem && selectedItem?.selection?.type && (
                    <Item variant="outline" size="sm" className='w-full bg-info/20 border-info text-info mt-2'>
                        <ItemMedia>
                            <SquareMousePointer className="size-5" />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>{selectionLabel}</ItemTitle>
                        </ItemContent>
                        <ItemMedia>
                            <Button size="icon-xs" variant="outline" onClick={removeSelection} className='bg-transparent border-info hover:bg-info/50 hover:text-background '><X /></Button>
                        </ItemMedia>
                    </Item>
                )}
                <PromptAttachmentsDisplay />
            </PromptInputHeader>
            <PromptInputBody>
                <PromptInputTextarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                        selectedItem
                            ? "Describe what to change for the selected element..."
                            : placeholder || "Describe your quiz..."
                    }
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
