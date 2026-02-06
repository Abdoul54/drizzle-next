ALTER TABLE "attachment" ADD COLUMN "message_id" text;--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "media_type" varchar(255);--> statement-breakpoint
ALTER TABLE "attachment" ADD COLUMN "size" integer;--> statement-breakpoint
CREATE INDEX "attachment_message_id_index" ON "attachment" USING btree ("message_id");