import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, jsonb, integer, vector } from "drizzle-orm/pg-core";


export const user = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => /* @__PURE__ */ new Date())
        .notNull(),
});

export const session = pgTable(
    "session",
    {
        id: text("id").primaryKey(),
        expiresAt: timestamp("expires_at").notNull(),
        token: text("token").notNull().unique(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
        ipAddress: text("ip_address"),
        userAgent: text("user_agent"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
    },
    (table) => [index("session_userId_idx").on(table.userId)],
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
        accessTokenExpiresAt: timestamp("access_token_expires_at"),
        refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
        scope: text("scope"),
        password: text("password"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
    "verification",
    {
        id: text("id").primaryKey(),
        identifier: text("identifier").notNull(),
        value: text("value").notNull(),
        expiresAt: timestamp("expires_at").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => /* @__PURE__ */ new Date())
            .notNull(),
    },
    (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
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



// REST

export const quizzes = pgTable(
    "quizzes",
    {
        id: text("id").primaryKey(),
        title: text("title").notNull(),
        description: text("description").notNull(),
        category: text("category").notNull(),
        types: jsonb("types").notNull()
    }
)

// Update conversations table - add quizId
export const conversations = pgTable(
    "conversations",
    {
        id: text("id").primaryKey(),
        title: text("title"),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        quizId: text("quiz_id")
            .notNull()
            .references(() => quizzes.id, { onDelete: "cascade" })
            .unique(), // unique enforces one-to-one
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .$onUpdate(() => new Date())
            .notNull(),
    },
    (table) => [
        index("conversation_user_idx").on(table.userId),
        index("conversation_quiz_idx").on(table.quizId),
    ]
);

export const messages = pgTable(
    "messages",
    {
        id: text("id").primaryKey(),

        conversationId: text("conversation_id")
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),

        role: text("role", {
            enum: ["system", "user", "assistant"],
        }).notNull(),

        metadata: jsonb("metadata"), // UIMessage.metadata

        parts: jsonb("parts").notNull(),
        // Array<UIMessagePart>

        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),
    },
    (table) => [
        index("message_conversation_idx").on(table.conversationId),
        index("message_parts_gin").using("gin", table.parts)
    ]
);

export const attachments = pgTable(
    "attachments",
    {
        id: text("id").primaryKey(),
        conversationId: text("conversation_id")
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),
        filename: text("filename").notNull(),
        url: text("url").notNull(),
        mimeType: text("mime_type").notNull(),
        size: integer("size").notNull(),
        embedding: vector("embedding", { dimensions: 768 }),
        createdAt: timestamp("created_at").defaultNow().notNull(),
    },
    (table) => [
        index("attachment_conversation_idx").on(table.conversationId),
        index("attachment_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
    ]);

export const attachmentRelations = relations(attachments, ({ one }) => ({
    conversation: one(conversations, {
        fields: [attachments.conversationId],
        references: [conversations.id],
    }),
}));

// Add relations
export const conversationRelations = relations(conversations, ({ one, many }) => ({
    user: one(user, {
        fields: [conversations.userId],
        references: [user.id],
    }),
    quiz: one(quizzes, {
        fields: [conversations.quizId],
        references: [quizzes.id],
    }),
    messages: many(messages),
    attachments: many(attachments),
}));

export const quizRelations = relations(quizzes, ({ one }) => ({
    conversation: one(conversations),
}));


export const messageRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
    }),
}));


