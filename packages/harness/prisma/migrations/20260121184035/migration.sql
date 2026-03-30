-- CreateTable
CREATE TABLE "tst_agents" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_test_cases" (
    "id" UUID NOT NULL,
    "schema_kind" TEXT NOT NULL,
    "name" TEXT,
    "data" JSONB NOT NULL,
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_configs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config_json" JSONB NOT NULL,
    "config_hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_runs" (
    "id" UUID NOT NULL,
    "config_id" UUID,
    "config_snapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total_test_cases" INTEGER NOT NULL DEFAULT 0,
    "completed_test_cases" INTEGER NOT NULL DEFAULT 0,
    "successful_test_cases" INTEGER NOT NULL DEFAULT 0,
    "failed_test_cases" INTEGER NOT NULL DEFAULT 0,
    "avg_score" DOUBLE PRECISION,
    "min_score" DOUBLE PRECISION,
    "max_score" DOUBLE PRECISION,
    "total_duration_ms" INTEGER,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "error_message" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_results" (
    "id" UUID NOT NULL,
    "run_id" UUID NOT NULL,
    "test_case_id" TEXT NOT NULL,
    "agent_id" UUID,
    "system_prompt_id" TEXT,
    "system_prompt_hash" TEXT,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "response" JSONB,
    "score" JSONB,
    "score_value" DOUBLE PRECISION,
    "input_tokens_used" INTEGER,
    "output_tokens_used" INTEGER,
    "input_cost" TEXT,
    "output_cost" TEXT,
    "duration_ms" INTEGER,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_triggers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "config_id" UUID NOT NULL,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "interval_seconds" INTEGER NOT NULL,
    "skip_if_recent_run_seconds" INTEGER,
    "next_run_at" TIMESTAMPTZ,
    "last_run_at" TIMESTAMPTZ,
    "last_run_id" UUID,
    "last_run_status" TEXT,
    "run_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_langfuse_triggers" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "prompt_name" TEXT NOT NULL,
    "config_id" UUID NOT NULL,
    "enabled" INTEGER NOT NULL DEFAULT 1,
    "debounce_seconds" INTEGER NOT NULL DEFAULT 30,
    "last_seen_version" INTEGER,
    "last_triggered_at" TIMESTAMPTZ,
    "last_triggered_version" INTEGER,
    "last_run_id" UUID,
    "last_run_status" TEXT,
    "trigger_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_langfuse_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_langfuse_prompt_versions" (
    "id" UUID NOT NULL,
    "prompt_name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content_hash" TEXT,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_langfuse_prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tst_agents_type_idx" ON "tst_agents"("type");

-- CreateIndex
CREATE INDEX "tst_agents_name_idx" ON "tst_agents"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tst_agents_provider_endpoint_url_name_key" ON "tst_agents"("provider", "endpoint_url", "name");

-- CreateIndex
CREATE INDEX "tst_test_cases_schema_kind_idx" ON "tst_test_cases"("schema_kind");

-- CreateIndex
CREATE INDEX "tst_configs_name_idx" ON "tst_configs"("name");

-- CreateIndex
CREATE INDEX "tst_configs_run_count_idx" ON "tst_configs"("run_count" DESC);

-- CreateIndex
CREATE INDEX "tst_configs_config_hash_idx" ON "tst_configs"("config_hash");

-- CreateIndex
CREATE INDEX "tst_runs_config_id_idx" ON "tst_runs"("config_id");

-- CreateIndex
CREATE INDEX "tst_runs_status_idx" ON "tst_runs"("status");

-- CreateIndex
CREATE INDEX "tst_runs_created_at_idx" ON "tst_runs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "tst_runs_avg_score_idx" ON "tst_runs"("avg_score");

-- CreateIndex
CREATE INDEX "tst_results_run_id_idx" ON "tst_results"("run_id");

-- CreateIndex
CREATE INDEX "tst_results_test_case_id_idx" ON "tst_results"("test_case_id");

-- CreateIndex
CREATE INDEX "tst_results_agent_id_idx" ON "tst_results"("agent_id");

-- CreateIndex
CREATE INDEX "tst_results_score_value_idx" ON "tst_results"("score_value");

-- CreateIndex
CREATE INDEX "tst_results_status_idx" ON "tst_results"("status");

-- CreateIndex
CREATE INDEX "tst_results_created_at_idx" ON "tst_results"("created_at");

-- CreateIndex
CREATE INDEX "tst_triggers_config_id_idx" ON "tst_triggers"("config_id");

-- CreateIndex
CREATE INDEX "tst_triggers_enabled_idx" ON "tst_triggers"("enabled");

-- CreateIndex
CREATE INDEX "tst_triggers_next_run_at_idx" ON "tst_triggers"("next_run_at");

-- CreateIndex
CREATE INDEX "tst_langfuse_triggers_prompt_name_idx" ON "tst_langfuse_triggers"("prompt_name");

-- CreateIndex
CREATE INDEX "tst_langfuse_triggers_config_id_idx" ON "tst_langfuse_triggers"("config_id");

-- CreateIndex
CREATE INDEX "tst_langfuse_triggers_enabled_idx" ON "tst_langfuse_triggers"("enabled");

-- CreateIndex
CREATE INDEX "tst_langfuse_prompt_versions_prompt_name_idx" ON "tst_langfuse_prompt_versions"("prompt_name");

-- CreateIndex
CREATE INDEX "tst_langfuse_prompt_versions_prompt_name_version_idx" ON "tst_langfuse_prompt_versions"("prompt_name", "version");

-- AddForeignKey
ALTER TABLE "tst_runs" ADD CONSTRAINT "tst_runs_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "tst_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_results" ADD CONSTRAINT "tst_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "tst_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_results" ADD CONSTRAINT "tst_results_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "tst_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_triggers" ADD CONSTRAINT "tst_triggers_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "tst_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_triggers" ADD CONSTRAINT "tst_triggers_last_run_id_fkey" FOREIGN KEY ("last_run_id") REFERENCES "tst_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_langfuse_triggers" ADD CONSTRAINT "tst_langfuse_triggers_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "tst_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_langfuse_triggers" ADD CONSTRAINT "tst_langfuse_triggers_last_run_id_fkey" FOREIGN KEY ("last_run_id") REFERENCES "tst_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
