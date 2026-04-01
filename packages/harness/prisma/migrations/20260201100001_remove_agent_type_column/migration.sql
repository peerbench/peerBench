-- Drop type index
DROP INDEX IF EXISTS "tst_agents_type_idx";

-- Drop type column
ALTER TABLE "tst_agents" DROP COLUMN "type";

-- Make name nullable
ALTER TABLE "tst_agents" ALTER COLUMN "name" DROP NOT NULL;
