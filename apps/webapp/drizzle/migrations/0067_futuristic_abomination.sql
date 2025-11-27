ALTER TABLE "responses" ALTER COLUMN "input_cost" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "responses" ALTER COLUMN "output_cost" SET DATA TYPE numeric(14, 4);--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "input_tokens_used" integer;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "output_tokens_used" integer;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "input_cost" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "output_cost" numeric(14, 4);