CREATE
OR REPLACE VIEW "public"."v_leaderboard" AS (
  select
    CASE
      WHEN "test_results"."model_name" IS NOT NULL THEN "test_results"."model_name"
      ELSE "test_results"."provider"
    END as "model",
    CASE
      WHEN "evaluations"."prompt_set_id" IS NOT NULL THEN "prompt_sets"."title"
      ELSE "evaluations"."protocol_name"
    END as "context",
    CASE
      WHEN "evaluations"."prompt_set_id" IS NULL THEN AVG("evaluations"."score")
      ELSE NULL
    END as "avg_score",
    CASE
      WHEN "evaluations"."prompt_set_id" IS NULL THEN NULL
      ELSE SUM("test_results"."score") / COUNT("test_results"."id")
    END as "accuracy",
    COUNT(DISTINCT "evaluations"."id") as "total_evaluations",
    MAX("evaluations"."finished_at") as "recent_evaluation",
    CASE
      WHEN "evaluations"."prompt_set_id" IS NOT NULL THEN COUNT(DISTINCT "prompts"."id")
      ELSE NULL
    END as "unique_prompts",
    COUNT("test_results"."id") as "total_tests_performed",
    "evaluations"."prompt_set_id",
    "prompts"."type" as "prompt_type"
  from
    "test_results"
    inner join "evaluations" on "test_results"."evaluation_id" = "evaluations"."id"
    left join "prompt_sets" on "evaluations"."prompt_set_id" = "prompt_sets"."id"
    left join "prompts" on "test_results"."prompt_id" = "prompts"."id"
  group by
    "model",
    "context",
    "prompts"."type",
    "evaluations"."prompt_set_id"
  having
    (
      (
        CASE
          WHEN "evaluations"."prompt_set_id" IS NULL THEN AVG("evaluations"."score")
          ELSE NULL
        END
      ) > 0
      or (
        CASE
          WHEN "evaluations"."prompt_set_id" IS NULL THEN NULL
          ELSE SUM("test_results"."score") / COUNT("test_results"."id")
        END
      ) > 0
    )
);