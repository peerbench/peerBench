-- AlterTable
ALTER TABLE "tst_results" ADD COLUMN     "pure_test_case_id" TEXT,
ADD COLUMN     "ttft_ms" INTEGER;

-- CreateIndex
CREATE INDEX "tst_results_pure_test_case_id_idx" ON "tst_results"("pure_test_case_id");
