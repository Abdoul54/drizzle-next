// =====================
// AUTH
// =====================

export interface User {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
    userId: string;
}

export interface Account {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    refreshTokenExpiresAt?: Date | null;
    scope?: string | null;
    password?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Verification {
    id: string;
    identifier: string;
    value: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

// =====================
// QUIZ
// =====================

export interface Quiz {
    id: string;
    title: string;
    description: string;
    category: string;
    types: Record<string, any>; // JSONB
}

// =====================
// CONVERSATIONS
// =====================

export interface Conversation {
    id: string;
    title?: string | null;
    userId: string;
    quizId: string;
    createdAt: Date;
    updatedAt: Date;
}

// =====================
// MESSAGES
// =====================

export type MessageRole = "user" | "assistant";

export interface Message {
    id: string;
    conversationId: string;
    role: MessageRole;
    content: string;
    createdAt: Date;
}

// =====================
// RELATION TYPES (OPTIONAL BUT USEFUL)
// =====================

export interface ConversationWithRelations extends Conversation {
    user: User;
    quiz: Quiz;
    messages: Message[];
}

export interface QuizWithConversation extends Quiz {
    conversation: Conversation;
}

export interface UserWithRelations extends User {
    sessions: Session[];
    accounts: Account[];
}
