CREATE
OR REPLACE VIEW "public"."v_model_scores_per_prompt" AS (
      (
            select
                  "scores"."prompt_id",
                  "scores"."id",
                  "scores"."score",
                  "provider_models"."model_id",
                  EXTRACT(
                        EPOCH
                        FROM
                              (
                                    "responses"."finished_at" - "responses"."started_at"
                              )
                  ) as "response_time",
                  false as "associated_with_known_model"
            from
                  "prompts"
                  inner join "scores" on "scores"."prompt_id" = "prompts"."id"
                  inner join "responses" on "responses"."id" = "scores"."response_id"
                  inner join "provider_models" on (
                        "provider_models"."id" = "responses"."model_id"
                        and "provider_models"."known_model_id" is null
                  )
      )
      union
      (
            select
                  "scores"."prompt_id",
                  "scores"."id",
                  "scores"."score",
                  "known_models"."name",
                  EXTRACT(
                        EPOCH
                        FROM
                              (
                                    "responses"."finished_at" - "responses"."started_at"
                              )
                  ) as "response_time",
                  true
            from
                  "prompts"
                  inner join "scores" on "scores"."prompt_id" = "prompts"."id"
                  inner join "responses" on "responses"."id" = "scores"."response_id"
                  inner join "provider_models" on "provider_models"."id" = "responses"."model_id"
                  inner join "known_models" on "known_models"."id" = "provider_models"."known_model_id"
      )
);

CREATE
OR REPLACE VIEW "public"."v_model_leaderboard_per_prompt_set" AS (
      select
            "prompt_set_prompts"."prompt_set_id",
            "v_model_scores_per_prompt"."model_id",
            avg("v_model_scores_per_prompt"."score") as "avg_score",
            avg("response_time") as "avg_response_time",
            count(distinct "v_model_scores_per_prompt"."prompt_id") as "total_prompts_tested",
            sum("v_model_scores_per_prompt"."score") as "total_score",
            count("v_model_scores_per_prompt"."id") as "total_score_count"
      from
            "v_model_scores_per_prompt"
            inner join "prompt_set_prompts" on (
                  "prompt_set_prompts"."prompt_id" = "v_model_scores_per_prompt"."prompt_id"
                  and "prompt_set_prompts"."status" = 'included'
            )
      group by
            "prompt_set_prompts"."prompt_set_id",
            "v_model_scores_per_prompt"."model_id"
);

--> statement-breakpoint