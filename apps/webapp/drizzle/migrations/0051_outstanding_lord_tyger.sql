CREATE TABLE "responses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"provider" text NOT NULL,
	"model_name" varchar(100) NOT NULL,
	"model_host" text DEFAULT 'auto',
	"model_owner" text NOT NULL,
	"model_id" text NOT NULL,
	"data" text NOT NULL,
	"cid" text NOT NULL,
	"sha256" text NOT NULL,
	"input_tokens_used" integer,
	"output_tokens_used" integer,
	"input_cost" real,
	"output_cost" real,
	"hash_sha256_registration" text NOT NULL,
	"hash_cid_registration" text NOT NULL,
	"prompt_id" uuid NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp NOT NULL,
	"finished_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scores" (
	"id" uuid PRIMARY KEY NOT NULL,
	"score" real NOT NULL,
	"prompt_hash_sha256_registration" text NOT NULL,
	"prompt_hash_cid_registration" text NOT NULL,
	"response_hash_sha256_registration" text NOT NULL,
	"response_hash_cid_registration" text NOT NULL,
	"prompt_id" uuid,
	"response_id" uuid,
	"scoring_method" varchar(20) NOT NULL,
	"scorer_user_id" uuid,
	"scorer_model_provider" varchar(100),
	"scorer_model_name" varchar(100),
	"scorer_model_host" text DEFAULT 'auto',
	"scorer_model_owner" text,
	"scorer_model_id" text,
	"uploader_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE cascade;