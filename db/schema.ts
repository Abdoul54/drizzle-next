import { pgEnum, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define enums for priority and status

export const priorities = ['low', 'medium', 'high'] as const;
export const statuses = ['todo', 'in_progress', 'done'] as const;

// Define enum separately
export const priorityEnum = pgEnum('priority', priorities);
export const statusEnum = pgEnum('status', statuses);

export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    priority: priorityEnum('priority').notNull().default('low'),
    status: statusEnum('status').notNull().default('todo'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow().$onUpdate(() => new Date()),
});