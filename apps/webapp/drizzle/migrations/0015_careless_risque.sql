ALTER TABLE "test_result_reviews" DROP CONSTRAINT "id_user_id_test_result_id_unique";--> statement-breakpoint
ALTER TABLE "test_result_reviews" ADD COLUMN "property" text;--> statement-breakpoint
ALTER TABLE "test_result_reviews" ADD CONSTRAINT "id_user_id_test_result_id_property_unique" UNIQUE("user_id","test_result_id","property","id");