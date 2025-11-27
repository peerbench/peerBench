-- Drop the identity constraint first
ALTER TABLE "model_matches" ALTER COLUMN "id" DROP IDENTITY IF EXISTS;--> statement-breakpoint
-- Now change the data type to uuid
-- IMPORTANT: This generates NEW UUIDs for all existing rows using gen_random_uuid()
-- Old integer IDs will be replaced with fresh UUIDs
ALTER TABLE "model_matches" ALTER COLUMN "id" SET DATA TYPE uuid USING gen_random_uuid();--> statement-breakpoint
-- Set the default for new rows
ALTER TABLE "model_matches" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
-- Add new columns
ALTER TABLE "model_matches" ADD COLUMN "model_a_response_id" uuid;--> statement-breakpoint
ALTER TABLE "model_matches" ADD COLUMN "model_b_response_id" uuid;--> statement-breakpoint
ALTER TABLE "model_matches" ADD COLUMN "is_shareable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Add foreign key constraints
ALTER TABLE "model_matches" ADD CONSTRAINT "model_matches_model_a_response_id_responses_id_fk" FOREIGN KEY ("model_a_response_id") REFERENCES "public"."responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_matches" ADD CONSTRAINT "model_matches_model_b_response_id_responses_id_fk" FOREIGN KEY ("model_b_response_id") REFERENCES "public"."responses"("id") ON DELETE no action ON UPDATE no action;