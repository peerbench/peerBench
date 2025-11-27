CREATE TABLE "prompt_set_prompts" (
	"prompt_set_id" integer NOT NULL,
	"prompt_id" uuid NOT NULL,
	"status" varchar(30) NOT NULL,
	CONSTRAINT "prompt_set_prompts_prompt_set_id_prompt_id_pk" PRIMARY KEY("prompt_set_id","prompt_id")
);
--> statement-breakpoint
ALTER TABLE "prompt_set_prompts" ADD CONSTRAINT "prompt_set_prompts_prompt_set_id_prompt_sets_id_fk" FOREIGN KEY ("prompt_set_id") REFERENCES "public"."prompt_sets"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prompt_set_prompts" ADD CONSTRAINT "prompt_set_prompts_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "prompts" DROP COLUMN "status";