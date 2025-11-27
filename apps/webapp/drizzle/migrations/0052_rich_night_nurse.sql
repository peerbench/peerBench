ALTER TABLE "scores" ADD COLUMN "hash_sha256_registration" text NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" ADD COLUMN "hash_cid_registration" text NOT NULL;--> statement-breakpoint
ALTER TABLE "scores" DROP COLUMN "uploader_id";