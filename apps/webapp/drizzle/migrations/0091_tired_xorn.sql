ALTER TABLE "user_profile" ALTER COLUMN "referral_code" SET DEFAULT encode(extensions.gen_random_bytes(16), 'hex');--> statement-breakpoint
ALTER TABLE "ranking_computations" ADD COLUMN "parameters" jsonb;--> statement-breakpoint
-- Update existing rows with a default value
UPDATE "ranking_computations" SET "parameters" = '{"reviewsForConsensusPrompt": 3, "accountAgeDays": 7, "k": 10, "minReviewPercentage": 0.5, "maxTrustCap": 0.75}'::jsonb WHERE "parameters" IS NULL;--> statement-breakpoint
ALTER TABLE "ranking_computations" ALTER COLUMN "parameters" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "ranking_computations" DROP COLUMN IF EXISTS "min_overlap";--> statement-breakpoint
ALTER TABLE "ranking_computations" DROP COLUMN IF EXISTS "account_age_days";