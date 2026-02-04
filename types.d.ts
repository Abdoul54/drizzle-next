// types.d.ts

// =============================================
// ENUMS
// =============================================

export type QuizStatus = "draft" | "published" | "unpublished";

export type QuestionType =
    | "choice"
    | "true-false"
    | "fill-in"
    | "long-fill-in"
    | "matching"
    | "sequencing"
    | "numeric"
    | "likert"
    | "performance";

// =============================================
// AUTH TYPES
// =============================================

export interface User {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface Session {
    id: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
    userId: string;
}

export interface Account {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken: string | null;
    refreshToken: string | null;
    idToken: string | null;
    accessTokenExpiresAt: Date | null;
    refreshTokenExpiresAt: Date | null;
    scope: string | null;
    password: string | null;
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

// =============================================
// QUIZ TYPES
// =============================================

export interface Quiz {
    id: number;
    title: string;
    description: string;
    status: QuizStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Question {
    id: number;
    quizId: number;
    type: QuestionType;
    media: string | null;
    text: string;
    subText: string | null;
}

export interface Option {
    id: number;
    questionId: number;
    label: string;
}

export interface Answer {
    id: number;
    questionId: number;
    value: number;
}

export interface Conversation {
    id: number;
    userId: string;
    quizId: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Message {
    id: number;
    conversationId: number;
    role: string;
    metadata: Record<string, unknown>;
    parts: unknown[];
    createdAt: Date;
}

// =============================================
// INSERT TYPES (omit auto-generated fields)
// =============================================

export type InsertUser = Omit<User, "createdAt" | "updatedAt" | "emailVerified"> & {
    emailVerified?: boolean;
};

export type InsertSession = Omit<Session, "createdAt" | "updatedAt">;

export type InsertAccount = Omit<Account, "createdAt" | "updatedAt">;

export type InsertVerification = Omit<Verification, "createdAt" | "updatedAt">;

export type InsertQuiz = Omit<Quiz, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: QuizStatus;
};

export type InsertQuestion = Omit<Question, "id">;

export type InsertOption = Omit<Option, "id">;

export type InsertAnswer = Omit<Answer, "id">;

export type InsertConversation = Omit<Conversation, "id" | "createdAt" | "updatedAt">;

export type InsertMessage = Omit<Message, "id" | "createdAt">;

// =============================================
// RELATIONS (for query results with joins)
// =============================================

export interface UserWithRelations extends User {
    sessions?: Session[];
    accounts?: Account[];
    quizzes?: Quiz[];
    conversations?: Conversation[];
}

export interface SessionWithRelations extends Session {
    user?: User;
}

export interface AccountWithRelations extends Account {
    user?: User;
}

export interface QuizWithRelations extends Quiz {
    createdByUser?: User;
    questions?: Question[];
    conversations?: Conversation[];
}

export interface QuestionWithRelations extends Question {
    quiz?: Quiz;
    options?: Option[];
    answers?: Answer[];
}

export interface OptionWithRelations extends Option {
    question?: Question;
    answers?: Answer[];
}

export interface AnswerWithRelations extends Answer {
    question?: Question;
    option?: Option;
}

export interface ConversationWithRelations extends Conversation {
    user?: User;
    quiz?: Quiz;
    messages?: Message[];
}

export interface MessageWithRelations extends Message {
    conversation?: Conversation;
}