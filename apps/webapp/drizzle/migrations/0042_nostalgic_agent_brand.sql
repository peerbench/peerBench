DROP VIEW "public"."v_users";--> statement-breakpoint
CREATE VIEW "public"."v_user_stats" AS (with "sq_prompt_reviews" as (select "prompt_reviews"."user_id", COALESCE(COUNT(DISTINCT "prompt_reviews"."id"), 0) as "reviewed_prompt_count", COALESCE(COUNT(DISTINCT "prompt_sets"."id"), 0) as "reviewed_prompt_set_count" from "prompt_reviews" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_id" = "prompt_reviews"."prompt_id" left join "prompt_sets" on "prompt_sets"."id" = "prompt_set_prompts"."prompt_set_id" group by "prompt_reviews"."user_id"), "sq_contributed_prompts" as (select "files"."uploader_id", COALESCE(COUNT(DISTINCT "prompts"."id"), 0) as "uploaded_prompt_count", 
          COUNT(
            CASE
              WHEN "prompts"."metadata"->>'generated-via' = 'peerbench-webapp' THEN 1
            END
          )
         as "generated_prompt_count" from "prompts" inner join "files" on "files"."id" = "prompts"."file_id" group by "files"."uploader_id"), "sq_avg_prompt_review_consensus" as (select "prompt_reviews"."user_id", 
            COALESCE(
              (COUNT(*) FILTER (
                WHERE
                  "pr"."prompt_id" = "prompt_reviews"."prompt_id" AND
                  "pr"."opinion" = "prompt_reviews"."opinion"
              ))::numeric(5, 2)
              /
              NULLIF(
                (COUNT(*) FILTER (
                  WHERE "pr"."prompt_id" = "prompt_reviews"."prompt_id"
                )),
                0
              ),
              0
            )
           as "avg_consensus" from "prompt_reviews" left join "prompt_reviews" "pr" on "pr"."user_id" <> "prompt_reviews"."user_id" group by "prompt_reviews"."user_id"), "sq_avg_score_created_prompt_sets" as (select COALESCE(AVG("test_results"."score"), 0) as "avg_score_of_created_prompt_sets", "prompt_sets"."owner_id" from "prompt_sets" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_set_id" = "prompt_sets"."id" left join "test_results" on "test_results"."prompt_id" = "prompt_set_prompts"."prompt_id" group by "prompt_sets"."owner_id"), "sq_avg_score_co_authored_prompt_sets" as (select COALESCE(AVG("test_results"."score"), 0) as "avg_score_of_co_authored_prompt_sets", "user_role_on_prompt_set"."user_id" from "prompt_sets" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_set_id" = "prompt_sets"."id" left join "user_role_on_prompt_set" on "user_role_on_prompt_set"."prompt_set_id" = "prompt_sets"."id" left join "test_results" on "test_results"."prompt_id" = "prompt_set_prompts"."prompt_id" group by "user_role_on_prompt_set"."user_id") select "auth"."users"."id", COALESCE(COUNT(DISTINCT "prompt_sets"."id"), 0) as "created_prompt_set_count", "reviewed_prompt_count", "reviewed_prompt_set_count", COALESCE(COUNT(DISTINCT "user_role_on_prompt_set"."prompt_set_id"), 0) as "co_created_prompt_set_count", "uploaded_prompt_count", "generated_prompt_count", "avg_consensus", "avg_score_of_created_prompt_sets", "avg_score_of_co_authored_prompt_sets" from "auth"."users" left join "prompt_sets" on "prompt_sets"."owner_id" = "auth"."users"."id" left join "user_role_on_prompt_set" on "user_role_on_prompt_set"."user_id" = "auth"."users"."id" left join "sq_prompt_reviews" on "sq_prompt_reviews"."user_id" = "auth"."users"."id" left join "sq_contributed_prompts" on "sq_contributed_prompts"."uploader_id" = "auth"."users"."id" left join "sq_avg_prompt_review_consensus" on "sq_avg_prompt_review_consensus"."user_id" = "auth"."users"."id" left join "sq_avg_score_created_prompt_sets" on "sq_avg_score_created_prompt_sets"."owner_id" = "auth"."users"."id" left join "sq_avg_score_co_authored_prompt_sets" on "sq_avg_score_co_authored_prompt_sets"."user_id" = "auth"."users"."id" group by "auth"."users"."id", "reviewed_prompt_count", "reviewed_prompt_set_count", "uploaded_prompt_count", "generated_prompt_count", "avg_consensus", "avg_score_of_created_prompt_sets", "avg_score_of_co_authored_prompt_sets");--> statement-breakpoint
CREATE VIEW "public"."v_users" AS (select "auth"."users"."id", "auth"."users"."email", "auth"."users"."last_sign_in_at", "user_profile"."display_name", "user_profile"."github", "user_profile"."website", "user_profile"."bluesky", "user_profile"."mastodon", "user_profile"."twitter", "user_profile"."created_at", "user_profile"."updated_at" from "auth"."users" inner join "user_profile" on "user_profile"."user_id" = "auth"."users"."id");