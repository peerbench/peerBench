CREATE TABLE
    "feedbacks_flags" (
        "feedback_id" integer NOT NULL,
        "flag_id" integer NOT NULL,
        CONSTRAINT "feedbacks_flags_feedback_id_flag_id_pk" PRIMARY KEY ("feedback_id", "flag_id")
    );

--> statement-breakpoint
ALTER TABLE "feedbacks"
RENAME COLUMN "type" TO "opinion";

--> statement-breakpoint
ALTER TABLE "feedback_flags"
DROP CONSTRAINT "feedback_flags_feedback_id_feedbacks_id_fk";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP CONSTRAINT "prompt_feedbacks_user_id_users_id_fk";

--> statement-breakpoint
/* 
Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
We are working on making it available!

Meanwhile you can:
1. Check pk name in your database, by running
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'test_result_feedbacks'
AND constraint_type = 'PRIMARY KEY';
2. Uncomment code below and paste pk name manually

Hope to release this update as soon as possible
 */
-- ALTER TABLE "test_result_feedbacks" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "id";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
ADD COLUMN "feedback_id" integer PRIMARY KEY NOT NULL;

--> statement-breakpoint
ALTER TABLE "feedbacks_flags" ADD CONSTRAINT "feedbacks_flags_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks" ("id") ON DELETE cascade ON UPDATE cascade;

--> statement-breakpoint
ALTER TABLE "feedbacks_flags" ADD CONSTRAINT "feedbacks_flags_flag_id_feedback_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."feedback_flags" ("id") ON DELETE cascade ON UPDATE cascade;

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks" ADD CONSTRAINT "prompt_feedbacks_feedback_id_feedbacks_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedbacks" ("id") ON DELETE cascade ON UPDATE cascade;

--> statement-breakpoint
ALTER TABLE "feedback_flags"
DROP COLUMN "feedback_id";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "user_id";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "feedback";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "flag";

--> statement-breakpoint
ALTER TABLE "prompt_feedbacks"
DROP COLUMN "created_at";

--> statement-breakpoint
ALTER TABLE "test_result_feedbacks"
DROP COLUMN "property";

--> statement-breakpoint
ALTER TABLE "test_result_feedbacks"
DROP COLUMN "property_value";