--> statement-breakpoint
DROP VIEW "public"."v_leaderboard";

--> statement-breakpoint
ALTER TABLE "models"
RENAME TO "provider_models";

--> statement-breakpoint
ALTER TABLE "model_matches"
DROP CONSTRAINT "model_matches_model_a_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "model_matches"
DROP CONSTRAINT "model_matches_model_b_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "model_matches"
DROP CONSTRAINT "model_matches_winner_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "responses"
DROP CONSTRAINT "responses_model_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "scores"
DROP CONSTRAINT "scores_scorer_model_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "test_results"
DROP CONSTRAINT "test_results_model_id_models_id_fk";

--> statement-breakpoint
ALTER TABLE "model_matches" ADD CONSTRAINT "model_matches_model_a_id_provider_models_id_fk" FOREIGN KEY ("model_a_id") REFERENCES "public"."provider_models" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "model_matches" ADD CONSTRAINT "model_matches_model_b_id_provider_models_id_fk" FOREIGN KEY ("model_b_id") REFERENCES "public"."provider_models" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "model_matches" ADD CONSTRAINT "model_matches_winner_id_provider_models_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."provider_models" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_model_id_provider_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."provider_models" ("id") ON DELETE restrict ON UPDATE cascade;

--> statement-breakpoint
ALTER TABLE "scores" ADD CONSTRAINT "scores_scorer_model_id_provider_models_id_fk" FOREIGN KEY ("scorer_model_id") REFERENCES "public"."provider_models" ("id") ON DELETE set null ON UPDATE cascade;

--> statement-breakpoint
ALTER TABLE "test_results" ADD CONSTRAINT "test_results_model_id_provider_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."provider_models" ("id") ON DELETE restrict ON UPDATE cascade;

--> statement-breakpoint
CREATE VIEW
  "public"."v_leaderboard" AS (
    select
      CASE
        WHEN "provider_models"."name" IS NOT NULL THEN "provider_models"."name"
        ELSE "provider_models"."provider"
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
      CASE
        WHEN "evaluations"."prompt_set_id" IS NULL THEN "evaluations"."protocol_address"
        ELSE NULL
      END as "source_protocol_address",
      "evaluations"."prompt_set_id",
      "prompts"."type" as "prompt_type"
    from
      "test_results"
      inner join "evaluations" on "test_results"."evaluation_id" = "evaluations"."id"
      left join "prompt_sets" on "evaluations"."prompt_set_id" = "prompt_sets"."id"
      left join "prompts" on "test_results"."prompt_id" = "prompts"."id"
      left join "provider_models" on "test_results"."model_id" = "provider_models"."id"
    group by
      "model",
      "context",
      "prompts"."type",
      "evaluations"."prompt_set_id",
      "source_protocol_address"
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

--> statement-breakpoint
ALTER SEQUENCE "models_id_seq"
RENAME TO "provider_models_id_seq";