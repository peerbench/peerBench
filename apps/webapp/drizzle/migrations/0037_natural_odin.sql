ALTER TABLE "user_role_on_prompt_set"
DROP COLUMN "id";

ALTER TABLE "user_role_on_prompt_set" ADD CONSTRAINT "user_role_on_prompt_set_user_id_prompt_set_id_pk" PRIMARY KEY ("user_id", "prompt_set_id");

--> statement-breakpoint
ALTER TABLE "prompt_set_prompts"
ADD COLUMN "created_at" timestamp DEFAULT now () NOT NULL;

--> statement-breakpoint
ALTER TABLE "prompt_set_prompts"
ADD COLUMN "updated_at" timestamp DEFAULT now () NOT NULL;

--> statement-breakpoint