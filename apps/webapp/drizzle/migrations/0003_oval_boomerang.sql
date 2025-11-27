ALTER TABLE "prompts" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "metadata" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "prompts" ADD COLUMN "type" varchar(30) DEFAULT 'multiple-choice' NOT NULL;--> statement-breakpoint
ALTER TABLE "rss_articles" DROP COLUMN "source";