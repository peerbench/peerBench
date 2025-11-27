ALTER TABLE "prompts" ALTER COLUMN "uploader_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ALTER COLUMN "uploader_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "uploader_id" SET NOT NULL;