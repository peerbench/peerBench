CREATE TABLE "prompt_set_invitations" (
	"code" varchar(32) PRIMARY KEY NOT NULL,
	"prompt_set_id" integer NOT NULL,
	"role" varchar(20) NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_set_invitations" ADD CONSTRAINT "prompt_set_invitations_prompt_set_id_prompt_sets_id_fk" FOREIGN KEY ("prompt_set_id") REFERENCES "public"."prompt_sets"("id") ON DELETE cascade ON UPDATE cascade;