// =============================================
// RELATIONS
// =============================================

import { relations } from "drizzle-orm";
import { account, answer, attachment, conversation, message, option, question, quiz, quizVersion, session, user } from "./schema";

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    quizzes: many(quiz),
    conversations: many(conversation),
}));

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}));

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}));

export const quizRelations = relations(quiz, ({ one, many }) => ({
    createdByUser: one(user, {
        fields: [quiz.createdBy],
        references: [user.id],
    }),
    activeVersion: one(quizVersion, {
        fields: [quiz.activeVersionId],
        references: [quizVersion.id],
    }),
    versions: many(quizVersion),
    conversations: many(conversation),
    attachments: many(attachment),
}));

export const quizVersionRelations = relations(quizVersion, ({ one, many }) => ({
    quiz: one(quiz, {
        fields: [quizVersion.quizId],
        references: [quiz.id],
    }),
    createdByUser: one(user, {
        fields: [quizVersion.createdBy],
        references: [user.id],
    }),
    questions: many(question),
}));


export const questionRelations = relations(question, ({ one, many }) => ({
    quizVersion: one(quizVersion, {
        fields: [question.quizVersionId],
        references: [quizVersion.id],
    }),
    options: many(option),
    answers: many(answer),
}));

export const optionRelations = relations(option, ({ one, many }) => ({
    question: one(question, {
        fields: [option.questionId],
        references: [question.id],
    }),
    answers: many(answer),
}));

export const answerRelations = relations(answer, ({ one }) => ({
    question: one(question, {
        fields: [answer.questionId],
        references: [question.id],
    }),
    option: one(option, {
        fields: [answer.value],
        references: [option.id],
    }),
}));

export const attachmentRelations = relations(attachment, ({ one }) => ({
    quiz: one(quiz, {
        fields: [attachment.quizId],
        references: [quiz.id],
    }),
    conversation: one(conversation, {
        fields: [attachment.conversationId],
        references: [conversation.id],
    }),
}));

export const conversationRelations = relations(conversation, ({ one, many }) => ({
    user: one(user, {
        fields: [conversation.userId],
        references: [user.id],
    }),
    quiz: one(quiz, {
        fields: [conversation.quizId],
        references: [quiz.id],
    }),
    messages: many(message),
    attachments: many(attachment),
}));

export const messageRelations = relations(message, ({ one, many }) => ({
    conversation: one(conversation, {
        fields: [message.conversationId],
        references: [conversation.id],
    }),
    attachments: many(attachment),
}));
