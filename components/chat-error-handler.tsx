// components/chat-error-handler.tsx
"use client";

import { AlertTriangle, Clock, ShieldAlert, BotMessageSquare } from "lucide-react";
import { Button } from "./ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./ui/empty";

interface ChatErrorHandlerProps {
    error: Error | null;
    onRetry?: () => void;
    onClear?: () => void;
}

interface ErrorDetails {
    title: string;
    description: string;
    icon: typeof BotMessageSquare;
    retryable: boolean;
    retryDelay?: number;
}

export default function ChatErrorHandler({ error, onRetry, onClear }: ChatErrorHandlerProps) {
    if (!error) return null;

    const errorDetails = parseError(error);

    return (
        <div className="flex flex-col h-full w-full gap-6 py-4">
            <Empty className="border border-solid border-destructive">
                <EmptyHeader>
                    <EmptyMedia variant="icon" className="w-20 h-20 bg-destructive/20">
                        <errorDetails.icon className="size-10 text-destructive" />
                    </EmptyMedia>
                    <EmptyTitle>{errorDetails.title}</EmptyTitle>
                    <EmptyDescription>{errorDetails.description}</EmptyDescription>

                    <div className="flex gap-2 mt-4">
                        {errorDetails.retryable && onRetry && (
                            <Button
                                onClick={onRetry}
                                variant="outline"
                                disabled={!!errorDetails.retryDelay}
                            >
                                {errorDetails.retryDelay
                                    ? `Retry in ${errorDetails.retryDelay}s`
                                    : 'Retry'
                                }
                            </Button>
                        )}
                        {onClear && (
                            <Button onClick={onClear} variant="ghost">
                                Dismiss
                            </Button>
                        )}
                    </div>
                </EmptyHeader>
            </Empty>
        </div>
    );
}

function parseError(error: Error): ErrorDetails {
    const message = error.message.toLowerCase();

    // Rate limit error
    if (message.includes('rate limit') || message.includes('429')) {
        return {
            title: 'Too Many Requests',
            description: 'You\'ve sent too many messages. Please wait a moment before trying again.',
            icon: Clock,
            retryable: true,
            retryDelay: extractRetryDelay(error),
        };
    }

    // Authentication error
    if (message.includes('unauthorized') || message.includes('401')) {
        return {
            title: 'Authentication Required',
            description: 'Your session has expired. Please sign in again.',
            icon: ShieldAlert,
            retryable: false,
        };
    }

    // Validation error
    if (message.includes('validation') || message.includes('invalid')) {
        return {
            title: 'Invalid Input',
            description: 'There was a problem with your message. Please try rephrasing.',
            icon: AlertTriangle,
            retryable: true,
        };
    }

    // Network error
    if (message.includes('network') || message.includes('fetch')) {
        return {
            title: 'Connection Error',
            description: 'Unable to connect to the server. Please check your internet connection.',
            icon: AlertTriangle,
            retryable: true,
        };
    }

    // Generic error
    return {
        title: 'Something Went Wrong',
        description: error.message || 'An unexpected error occurred. Please try again.',
        icon: BotMessageSquare,
        retryable: true,
    };
}

function extractRetryDelay(error: Error): number | undefined {
    const match = error.message.match(/retry[^\d]*(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
}