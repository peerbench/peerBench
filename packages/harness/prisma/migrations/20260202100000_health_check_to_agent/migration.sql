-- Truncate health check results (clean slate since FK target changes)
TRUNCATE TABLE "tst_health_check_results";

-- Drop old FK and index on endpoint_id
ALTER TABLE "tst_health_check_results" DROP CONSTRAINT IF EXISTS "tst_health_check_results_endpoint_id_fkey";
DROP INDEX IF EXISTS "tst_health_check_results_endpoint_id_idx";

-- Drop the endpoint_id column
ALTER TABLE "tst_health_check_results" DROP COLUMN "endpoint_id";

-- Add agent_id column
ALTER TABLE "tst_health_check_results" ADD COLUMN "agent_id" UUID NOT NULL;

-- Add checked_path column
ALTER TABLE "tst_health_check_results" ADD COLUMN "checked_path" TEXT;

-- Add FK to agents
ALTER TABLE "tst_health_check_results" ADD CONSTRAINT "tst_health_check_results_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "tst_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index on agent_id
CREATE INDEX "tst_health_check_results_agent_id_idx" ON "tst_health_check_results"("agent_id");

-- Drop the health check endpoints table
DROP TABLE "tst_health_check_endpoints";
