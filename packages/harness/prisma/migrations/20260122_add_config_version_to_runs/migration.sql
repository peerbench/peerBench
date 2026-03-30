-- AlterTable: Add config_version column to tst_runs
ALTER TABLE "tst_runs" ADD COLUMN "config_version" INTEGER;

-- Backfill config_version based on configSnapshot hash changes over time
-- This reconstructs version history by detecting when config content changed
WITH run_hashes AS (
  SELECT
    id,
    config_id,
    created_at,
    md5(config_snapshot::text) as snapshot_hash,
    LAG(md5(config_snapshot::text)) OVER (
      PARTITION BY config_id
      ORDER BY created_at
    ) as prev_hash
  FROM tst_runs
  WHERE config_id IS NOT NULL
),
version_changes AS (
  SELECT
    id,
    config_id,
    created_at,
    CASE
      WHEN prev_hash IS NULL OR snapshot_hash != prev_hash THEN 1
      ELSE 0
    END as is_new_version
  FROM run_hashes
),
cumulative_versions AS (
  SELECT
    id,
    SUM(is_new_version) OVER (
      PARTITION BY config_id
      ORDER BY created_at
    ) as config_version
  FROM version_changes
)
UPDATE tst_runs r
SET config_version = cv.config_version
FROM cumulative_versions cv
WHERE r.id = cv.id;

-- For runs without a config_id, set version to NULL (already the default)
-- No action needed as the column allows NULL

-- CreateIndex for better query performance
CREATE INDEX "tst_runs_config_version_idx" ON "tst_runs"("config_version");
