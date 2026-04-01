-- AlterTable
ALTER TABLE "tst_configs" ADD COLUMN     "is_favorite" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tst_health_check_endpoints" (
    "id" UUID NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "display_url" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "health_check_path" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "last_checked_at" TIMESTAMPTZ,
    "last_status" TEXT,
    "last_error" TEXT,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_health_check_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tst_health_check_results" (
    "id" UUID NOT NULL,
    "endpoint_id" UUID NOT NULL,
    "run_id" UUID,
    "status" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "error_message" TEXT,
    "checked_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_health_check_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tst_health_check_endpoints_normalized_url_key" ON "tst_health_check_endpoints"("normalized_url");

-- CreateIndex
CREATE INDEX "tst_health_check_endpoints_normalized_url_idx" ON "tst_health_check_endpoints"("normalized_url");

-- CreateIndex
CREATE INDEX "tst_health_check_endpoints_provider_idx" ON "tst_health_check_endpoints"("provider");

-- CreateIndex
CREATE INDEX "tst_health_check_endpoints_pinned_idx" ON "tst_health_check_endpoints"("pinned");

-- CreateIndex
CREATE INDEX "tst_health_check_endpoints_last_checked_at_idx" ON "tst_health_check_endpoints"("last_checked_at");

-- CreateIndex
CREATE INDEX "tst_health_check_results_endpoint_id_idx" ON "tst_health_check_results"("endpoint_id");

-- CreateIndex
CREATE INDEX "tst_health_check_results_checked_at_idx" ON "tst_health_check_results"("checked_at");

-- CreateIndex
CREATE INDEX "tst_health_check_results_status_idx" ON "tst_health_check_results"("status");

-- CreateIndex
CREATE INDEX "tst_configs_is_favorite_idx" ON "tst_configs"("is_favorite");

-- AddForeignKey
ALTER TABLE "tst_health_check_results" ADD CONSTRAINT "tst_health_check_results_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "tst_health_check_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_health_check_results" ADD CONSTRAINT "tst_health_check_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "tst_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
