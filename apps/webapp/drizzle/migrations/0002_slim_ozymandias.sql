CREATE TABLE "rss_articles" (
	"id" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"is_processed" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"source_url" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
