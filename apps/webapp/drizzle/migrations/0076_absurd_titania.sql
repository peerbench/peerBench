ALTER TABLE "prompts" ALTER COLUMN "question" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "full_prompt" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "is_revealed" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "responses" ADD COLUMN "is_revealed" boolean DEFAULT true NOT NULL;