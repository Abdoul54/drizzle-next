CREATE TYPE "public"."status" AS ENUM('draft', 'published', 'unpublished');--> statement-breakpoint
ALTER TABLE "attachments" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "status" "status";--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "data" jsonb;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "quizzes" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;