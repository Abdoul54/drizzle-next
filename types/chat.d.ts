// types/chat.d.ts
export interface Conversation {
    id: string;
    title: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: string;
    conversationId: string;
    role: "user" | "assistant";
    content: string;
    createdAt: Date;
}