-- Step 1: Add column as nullable
ALTER TABLE "tst_agents" ADD COLUMN "agent_id" TEXT;

-- Step 2: Populate from metadata->>'model', fallback to name
UPDATE "tst_agents"
SET "agent_id" = COALESCE(
  NULLIF(TRIM(metadata->>'model'), ''),
  name
);

-- Step 3: Make NOT NULL
ALTER TABLE "tst_agents" ALTER COLUMN "agent_id" SET NOT NULL;

-- Step 4: Drop old unique constraint and create new one
DROP INDEX "tst_agents_provider_endpoint_url_name_key";
ALTER TABLE "tst_agents" ADD CONSTRAINT "tst_agents_provider_endpoint_url_agent_id_key" UNIQUE ("provider", "endpoint_url", "agent_id");
