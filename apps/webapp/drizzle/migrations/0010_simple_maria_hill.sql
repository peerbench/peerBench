ALTER TABLE "feedbacks_flags" RENAME TO "feedbacks_feedback_flags";--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" DROP CONSTRAINT "feedbacks_flags_feedback_id_feedbacks_id_fk";
--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" DROP CONSTRAINT "feedbacks_flags_flag_id_feedback_flags_id_fk";
--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" DROP CONSTRAINT "feedbacks_flags_feedback_id_flag_id_pk";--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" ADD CONSTRAINT "feedbacks_feedback_flags_feedback_id_flag_id_pk" PRIMARY KEY("feedback_id","flag_id");--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" ADD CONSTRAINT "feedbacks_feedback_flags_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "feedbacks_feedback_flags" ADD CONSTRAINT "feedbacks_feedback_flags_flag_id_feedback_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feedback_flags"("id") ON DELETE cascade ON UPDATE cascade;