ALTER TABLE "comments" RENAME COLUMN "comment" TO "content";--> statement-breakpoint
ALTER TABLE "comments" RENAME COLUMN "comment_id" TO "parent_comment_id";--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_comment_id_comments_id_fk";
--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "top_level_comment_id" integer;--> statement-breakpoint
ALTER TABLE "quick_feedbacks" ADD COLUMN "opinion" varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_comment_id_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_feedbacks" ADD CONSTRAINT "quick_feedbacks_user_id_response_id_unique" UNIQUE("user_id","response_id");--> statement-breakpoint
ALTER TABLE "quick_feedbacks" ADD CONSTRAINT "quick_feedbacks_user_id_score_id_unique" UNIQUE("user_id","score_id");--> statement-breakpoint
ALTER TABLE "quick_feedbacks" ADD CONSTRAINT "quick_feedbacks_user_id_prompt_id_unique" UNIQUE("user_id","prompt_id");