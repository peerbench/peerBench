ALTER TABLE "prompts" ALTER COLUMN "metadata" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "scorers" jsonb;