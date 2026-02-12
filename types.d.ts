// ============================================
// AUTO TYPES FROM DRIZZLE SCHEMA
// Source of truth = database schema
// ============================================

import { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
    user,
    session,
    account,
    verification,
    quiz,
    question,
    option,
    answer,
    conversation,
    message,
    attachment,
    quizStatusEnum,
    questionTypeEnum,
} from "@/db/schema"; // ← adjust path if needed


// ============================================
// ENUM TYPES (always synced with DB)
// ============================================

export type QuizStatus = typeof quizStatusEnum.enumValues[number];
export type QuestionType = typeof questionTypeEnum.enumValues[number];


// ============================================
// SELECT TYPES (returned from DB)
// ============================================

export type User = InferSelectModel<typeof user>;
export type Session = InferSelectModel<typeof session>;
export type Account = InferSelectModel<typeof account>;
export type Verification = InferSelectModel<typeof verification>;

export type Quiz = InferSelectModel<typeof quiz>;
export type Question = InferSelectModel<typeof question>;
export type Option = InferSelectModel<typeof option>;
export type Answer = InferSelectModel<typeof answer>;
export type Conversation = InferSelectModel<typeof conversation>;
export type Message = InferSelectModel<typeof message>;
export type Attachment = InferSelectModel<typeof attachment>;


// ============================================
// INSERT TYPES (for inserts)
// ============================================

export type InsertUser = InferInsertModel<typeof user>;
export type InsertSession = InferInsertModel<typeof session>;
export type InsertAccount = InferInsertModel<typeof account>;
export type InsertVerification = InferInsertModel<typeof verification>;

export type InsertQuiz = InferInsertModel<typeof quiz>;
export type InsertQuestion = InferInsertModel<typeof question>;
export type InsertOption = InferInsertModel<typeof option>;
export type InsertAnswer = InferInsertModel<typeof answer>;
export type InsertConversation = InferInsertModel<typeof conversation>;
export type InsertMessage = InferInsertModel<typeof message>;
export type InsertAttachment = InferInsertModel<typeof attachment>;


// ============================================
// HELPER: WITH RELATIONS (optional)
// Use only when needed
// ============================================

export type QuizWithQuestions = Quiz & {
    questions?: (Question & {
        options?: Option[];
        answers?: Answer[];
    })[];
};

export type QuestionWithOptions = Question & {
    options: Option[];
    answers?: Answer[];
};


export type ConversationFull = Conversation & {
    messages?: Message[];
    attachments?: Attachment[];
    quiz?: Quiz;
    user?: User;
};
