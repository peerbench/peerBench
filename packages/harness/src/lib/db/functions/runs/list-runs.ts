import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Run } from "../../types";

export async function listRuns(
  params: ListRunsParams = {}
): Promise<{ runs: (Run & { configName: string | null })[]; total: number }> {
  const {
    configId,
    configTag,
    status,
    runner,
    scorer,
    source,
    agentId,
    provider,
    includePracticeRuns = false,
    limit = 50,
    offset = 0,
  } = params;
  const client = getClient(params.tx);

  const conditions: Prisma.Sql[] = [];

  if (!includePracticeRuns) {
    conditions.push(
      Prisma.sql`(r.metadata->>'isPracticeRun' IS NULL OR r.metadata->>'isPracticeRun' != 'true')`
    );
  }

  if (configId) {
    conditions.push(Prisma.sql`r.config_id = ${configId}::uuid`);
  }
  if (status) {
    conditions.push(Prisma.sql`r.status = ${status}`);
  }
  if (runner) {
    conditions.push(Prisma.sql`r.config_snapshot->>'runner' = ${runner}`);
  }
  if (scorer) {
    conditions.push(
      Prisma.sql`r.config_snapshot->'scorer'->>'type' = ${scorer}`
    );
  }
  if (source) {
    conditions.push(Prisma.sql`r.metadata->>'triggeredBy' = ${source}`);
  }
  if (configTag) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM tst_configs c WHERE c.id = r.config_id AND c.config_json->'tags' ? ${configTag}
      )`
    );
  }
  if (agentId) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM tst_results res WHERE res.run_id = r.id AND res.agent_id = ${agentId}::uuid
      )`
    );
  }
  if (provider) {
    conditions.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM tst_results res
        INNER JOIN tst_agents a ON res.agent_id = a.id
        WHERE res.run_id = r.id AND a.provider = ${provider}
      )`
    );
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const runs = await client.$queryRaw<RawRun[]>`
    SELECT r.*, c.name as config_name
    FROM tst_runs r
    LEFT JOIN tst_configs c ON r.config_id = c.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const countResult = await client.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) as count FROM tst_runs r
    ${whereClause}
  `;

  return {
    runs: runs.map(normalizeRunFromRaw),
    total: Number(countResult[0]?.count ?? 0),
  };
}

function normalizeRunFromRaw(raw: RawRun): Run & { configName: string | null } {
  return {
    id: raw.id,
    configId: raw.config_id,
    configVersion: raw.config_version,
    configSnapshot: raw.config_snapshot,
    configName: raw.config_name,
    status: raw.status,
    totalTestCases: raw.total_test_cases,
    completedTestCases: raw.completed_test_cases,
    successfulTestCases: raw.successful_test_cases,
    failedTestCases: raw.failed_test_cases,
    avgScore: raw.avg_score,
    minScore: raw.min_score,
    maxScore: raw.max_score,
    totalDurationMs: raw.total_duration_ms,
    startedAt: raw.started_at,
    completedAt: raw.completed_at,
    errorMessage: raw.error_message,
    metadata: raw.metadata,
    createdAt: raw.created_at,
  };
}

type RawRun = {
  id: string;
  config_id: string | null;
  config_version: number | null;
  config_snapshot: Prisma.JsonValue;
  config_name: string | null;
  status: string;
  total_test_cases: number;
  completed_test_cases: number;
  successful_test_cases: number;
  failed_test_cases: number;
  avg_score: number | null;
  min_score: number | null;
  max_score: number | null;
  total_duration_ms: number | null;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  metadata: Prisma.JsonValue;
  created_at: Date;
};

export type ListRunsParams = {
  configId?: string;
  configTag?: string;
  status?: string;
  runner?: string;
  scorer?: string;
  source?: string;
  agentId?: string;
  provider?: string;
  includePracticeRuns?: boolean;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
