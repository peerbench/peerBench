-- Phase 1: Add column
ALTER TABLE tst_configs
  ADD COLUMN initial_config_id UUID REFERENCES tst_configs(id) ON DELETE SET NULL;

CREATE INDEX idx_configs_initial_config_id ON tst_configs(initial_config_id);

-- Phase 2: Backfill historical versions from run snapshots
-- For each existing Config at version N > 1, create Config rows for earlier versions
-- using the earliest run snapshot per version.
WITH version_candidates AS (
  SELECT DISTINCT ON (r.config_id, r.config_version)
    r.config_id,
    r.config_version AS version,
    r.config_snapshot AS config_json,
    r.created_at
  FROM tst_runs r
  WHERE r.config_id IS NOT NULL
    AND r.config_version IS NOT NULL
    AND r.config_version < (
      SELECT c.version FROM tst_configs c WHERE c.id = r.config_id
    )
  ORDER BY r.config_id, r.config_version, r.created_at ASC
)
INSERT INTO tst_configs (
  id, name, description, config_json, config_hash, version, run_count,
  tags, is_favorite, created_by, initial_config_id, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  c.name,
  c.description,
  vc.config_json,
  md5(vc.config_json::text),
  vc.version,
  0,
  c.tags,
  c.is_favorite,
  c.created_by,
  c.id,
  vc.created_at,
  vc.created_at
FROM version_candidates vc
JOIN tst_configs c ON c.id = vc.config_id;

-- Phase 3: Re-point runs to correct version rows
-- Runs that used an older version of a config should point to the
-- newly-created historical version row.
UPDATE tst_runs r
SET config_id = cv.id
FROM tst_configs cv
WHERE cv.initial_config_id = r.config_id
  AND cv.version = r.config_version
  AND r.config_version IS NOT NULL
  AND r.config_version < (
    SELECT c.version FROM tst_configs c WHERE c.id = cv.initial_config_id
  );

-- Phase 4: Recount runs per version
UPDATE tst_configs c
SET run_count = (SELECT COUNT(*) FROM tst_runs r WHERE r.config_id = c.id);
