'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, UIMessage } from 'ai';

export function useChatController() {
    const [input, setInput] = useState('');
    const [webSearch, setWebSearch] = useState(false);

    const chat = useChat({
        transport: new DefaultChatTransport({
            api: '/api/v2/chat',
        }),
    });

    const submit = (message: UIMessage) => {
        if (!message) return;
        chat.sendMessage(message);
        setInput('');
    };

    return {
        ...chat,
        input,
        setInput,
        webSearch,
        setWebSearch,
        submit,
    };
}
