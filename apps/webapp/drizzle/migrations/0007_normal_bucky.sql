ALTER TABLE "test_result_feedbacks"
ALTER COLUMN "feedback_id"
SET
    NOT NULL;

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "id";

--> statement-breakpoint
ALTER TABLE "test_result_feedbacks"
DROP COLUMN "id";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks" ADD PRIMARY KEY ("feedback_id");

--> statement-breakpoint
ALTER TABLE "test_result_feedbacks" ADD PRIMARY KEY ("feedback_id");

--> statement-breakpoint
ALTER TABLE "feedback_flags" ADD CONSTRAINT "feedback_flags_flag_unique" UNIQUE ("flag");