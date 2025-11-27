DROP VIEW "public"."v_user_stats";--> statement-breakpoint
CREATE VIEW "public"."v_user_stats" AS (with "sq_prompt_quick_feedbacks" as (select "quick_feedbacks"."user_id", 
          COALESCE(COUNT(DISTINCT "prompt_sets"."id"), 0)
         as "prompt_set_feedback_count", 
          COUNT(DISTINCT "quick_feedbacks"."id")
          FILTER (WHERE "quick_feedbacks"."prompt_id" IS NOT NULL)
         as "prompt_quick_feedback_count" from "quick_feedbacks" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_id" = "quick_feedbacks"."prompt_id" left join "prompt_sets" on "prompt_set_prompts"."prompt_set_id" = "prompt_sets"."id" group by "quick_feedbacks"."user_id"), "sq_contributed_prompts" as (select "hash_registrations"."uploader_id", COALESCE(COUNT(DISTINCT "prompts"."id"), 0) as "uploaded_prompt_count", 
          COUNT("prompts"."id")
          FILTER (WHERE "prompts"."metadata"->>'generated-via' = 'peerbench-webapp')
         as "generated_prompt_count", 
          COUNT(DISTINCT "prompts"."id")
          FILTER (WHERE "prompt_set_prompts"."status" = 'included')
         as "verified_prompt_count" from "prompts" inner join "hash_registrations" on ("hash_registrations"."cid" = "prompts"."hash_cid_registration" and "hash_registrations"."sha256" = "prompts"."hash_sha256_registration") left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_id" = "prompts"."id" group by "hash_registrations"."uploader_id"), "sq_avg_prompt_quick_feedback_consensus" as (select "quick_feedbacks"."user_id", 
            COALESCE(
              (COUNT(*) FILTER (
                WHERE
                  "qf"."prompt_id" = "quick_feedbacks"."prompt_id" AND
                  "qf"."opinion" = "quick_feedbacks"."opinion"
              ))::numeric(5, 2)
              /
              NULLIF(
                (COUNT(*) FILTER (
                  WHERE "qf"."prompt_id" = "quick_feedbacks"."prompt_id"
                )),
                0
              ),
              0
            )
           as "avg_consensus" from "quick_feedbacks" left join "quick_feedbacks" "qf" on "qf"."user_id" <> "quick_feedbacks"."user_id" group by "quick_feedbacks"."user_id"), "sq_avg_score_created_prompt_sets" as (select COALESCE(AVG("scores"."score"), 0) as "avg_score_of_created_prompt_sets", "prompt_sets"."owner_id" from "prompt_sets" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_set_id" = "prompt_sets"."id" left join "scores" on "scores"."prompt_id" = "prompt_set_prompts"."prompt_id" group by "prompt_sets"."owner_id"), "sq_avg_score_co_authored_prompt_sets" as (select COALESCE(AVG("scores"."score"), 0) as "avg_score_of_co_authored_prompt_sets", "user_role_on_prompt_set"."user_id" from "prompt_sets" left join "prompt_set_prompts" on "prompt_set_prompts"."prompt_set_id" = "prompt_sets"."id" left join "user_role_on_prompt_set" on "user_role_on_prompt_set"."prompt_set_id" = "prompt_sets"."id" left join "scores" on "scores"."prompt_id" = "prompt_set_prompts"."prompt_id" group by "user_role_on_prompt_set"."user_id"), "sq_prompt_comments" as (((select "id", "user_id" from "prompt_comments") union all (select "id", "user_id" from "response_comments")) union all (select "id", "user_id" from "score_comments")) select "auth"."users"."id", COALESCE(COUNT(DISTINCT "prompt_sets"."id"), 0) as "created_prompt_set_count", COALESCE(COUNT(DISTINCT "sq_prompt_comments"."id"), 0) as "total_comment_count", "prompt_quick_feedback_count", "prompt_set_feedback_count", COALESCE(COUNT(DISTINCT "user_role_on_prompt_set"."prompt_set_id"), 0) as "co_created_prompt_set_count", "uploaded_prompt_count", "generated_prompt_count", "verified_prompt_count", "avg_consensus", "avg_score_of_created_prompt_sets", "avg_score_of_co_authored_prompt_sets" from "auth"."users" left join "prompt_sets" on "prompt_sets"."owner_id" = "auth"."users"."id" left join "user_role_on_prompt_set" on "user_role_on_prompt_set"."user_id" = "auth"."users"."id" left join "sq_prompt_quick_feedbacks" on "sq_prompt_quick_feedbacks"."user_id" = "auth"."users"."id" left join "sq_contributed_prompts" on "sq_contributed_prompts"."uploader_id" = "auth"."users"."id" left join "sq_avg_prompt_quick_feedback_consensus" on "sq_avg_prompt_quick_feedback_consensus"."user_id" = "auth"."users"."id" left join "sq_avg_score_created_prompt_sets" on "sq_avg_score_created_prompt_sets"."owner_id" = "auth"."users"."id" left join "sq_avg_score_co_authored_prompt_sets" on "sq_avg_score_co_authored_prompt_sets"."user_id" = "auth"."users"."id" left join "sq_prompt_comments" on "sq_prompt_comments"."user_id" = "auth"."users"."id" group by "auth"."users"."id", "prompt_quick_feedback_count", "prompt_set_feedback_count", "uploaded_prompt_count", "generated_prompt_count", "verified_prompt_count", "avg_consensus", "avg_score_of_created_prompt_sets", "avg_score_of_co_authored_prompt_sets");