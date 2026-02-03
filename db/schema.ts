import { relations } from "drizzle-orm";
import {
    pgTable,
    text,
    boolean,
    timestamp,
    bigserial,
    bigint,
    varchar,
    integer,
    jsonb,
    index,
} from "drizzle-orm/pg-core";

// =============================================
// AUTH TABLES
// =============================================

export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 0 })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at", { precision: 0 }).notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { precision: 0 })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_user_id_index").on(table.userId)]
);

export const account = pgTable(
    "account",
    {
        id: text("id").primaryKey(),
        accountId: text("account_id").notNull(),
        providerId: text("provider_id").notNull(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        accessToken: text("access_token"),
        refreshToken: text("refresh_token"),
        idToken: text("id_token"),
        accessTokenExpiresAt: timestamp("access_token_expires_at", { precision: 0 }),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { precision: 0 }),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { precision: 0 })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [index("account_user_id_index").on(table.userId)]
);

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at", { precision: 0 }).notNull(),
        createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { precision: 0 })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [index("verification_identifier_index").on(table.identifier)]
);

// =============================================
// QUIZ TABLES
// =============================================

export const quiz = pgTable("quiz", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: varchar("description", { length: 255 }).notNull(),
    createdBy: text("created_by")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 0 })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const question = pgTable("question", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    quizId: bigint("quiz_id", { mode: "number" })
        .notNull()
        .references(() => quiz.id, { onDelete: "cascade" }),
    type: integer("type").notNull(),
    media: varchar("media", { length: 255 }),
    text: varchar("text", { length: 255 }).notNull(),
    subText: varchar("sub_text", { length: 255 }),
});

export const option = pgTable("option", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    questionId: bigint("question_id", { mode: "number" })
        .notNull()
        .references(() => question.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 255 }).notNull(),
});

export const answer = pgTable("answer", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    questionId: bigint("question_id", { mode: "number" })
        .notNull()
        .references(() => question.id, { onDelete: "cascade" }),
    value: bigint("value", { mode: "number" })
        .notNull()
        .references(() => option.id, { onDelete: "cascade" }),
});

export const conversation = pgTable("conversation", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    quizId: bigint("quiz_id", { mode: "number" })
        .notNull()
        .references(() => quiz.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { precision: 0 })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const message = pgTable("message", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: bigint("conversation_id", { mode: "number" })
        .notNull()
        .references(() => conversation.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 255 }).notNull(),
    metadata: jsonb("metadata").notNull(),
    parts: jsonb("parts").notNull(),
    createdAt: timestamp("created_at", { precision: 0 }).notNull().defaultNow(),
});

// =============================================
// RELATIONS
// =============================================

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
    questions: many(question),
    conversations: many(conversation),
}));

export const questionRelations = relations(question, ({ one, many }) => ({
    quiz: one(quiz, {
        fields: [question.quizId],
        references: [quiz.id],
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
}));

export const messageRelations = relations(message, ({ one }) => ({
    conversation: one(conversation, {
        fields: [message.conversationId],
        references: [conversation.id],
    }),
}));