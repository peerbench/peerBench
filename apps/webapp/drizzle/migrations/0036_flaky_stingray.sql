ALTER TABLE "prompts" DROP CONSTRAINT "prompts_prompt_set_id_prompt_sets_id_fk";
--> statement-breakpoint
ALTER TABLE "prompts" DROP COLUMN "prompt_set_id";