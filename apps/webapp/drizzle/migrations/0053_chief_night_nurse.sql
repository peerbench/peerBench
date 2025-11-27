ALTER TABLE "scores" DROP CONSTRAINT "scores_prompt_id_prompts_id_fk";
--> statement-breakpoint
ALTER TABLE "scores" DROP CONSTRAINT "scores_response_id_responses_id_fk";
--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "prompts" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "responses" ALTER COLUMN "model_host" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "responses" ALTER COLUMN "metadata" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "scores" ALTER COLUMN "scorer_model_host" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "metadata" jsonb;