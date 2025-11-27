ALTER TABLE "provider_models" ADD COLUMN "per_million_token_input_cost" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "provider_models" ADD COLUMN "per_million_token_output_cost" numeric(14, 4);