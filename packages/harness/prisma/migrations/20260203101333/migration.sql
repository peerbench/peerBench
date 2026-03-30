-- DropForeignKey
ALTER TABLE "tst_configs" DROP CONSTRAINT "tst_configs_initial_config_id_fkey";

-- CreateTable
CREATE TABLE "tst_feedback" (
    "id" UUID NOT NULL,
    "result_id" UUID NOT NULL,
    "sentiment" TEXT NOT NULL,
    "comment" TEXT,
    "name" TEXT NOT NULL DEFAULT 'Anonymous',
    "user_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tst_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tst_feedback_result_id_idx" ON "tst_feedback"("result_id");

-- CreateIndex
CREATE INDEX "tst_feedback_sentiment_idx" ON "tst_feedback"("sentiment");

-- CreateIndex
CREATE INDEX "tst_feedback_created_at_idx" ON "tst_feedback"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "tst_configs" ADD CONSTRAINT "tst_configs_initial_config_id_fkey" FOREIGN KEY ("initial_config_id") REFERENCES "tst_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tst_feedback" ADD CONSTRAINT "tst_feedback_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "tst_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_configs_initial_config_id" RENAME TO "tst_configs_initial_config_id_idx";
