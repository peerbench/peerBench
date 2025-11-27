ALTER TABLE "provider_models" DROP CONSTRAINT "unique_model";--> statement-breakpoint
ALTER TABLE "provider_models" ADD CONSTRAINT "unique_model" UNIQUE("model_id");