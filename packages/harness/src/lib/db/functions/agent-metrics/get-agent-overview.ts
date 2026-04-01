import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getAgentOverview(
  params: GetAgentOverviewParams
): Promise<{
  runCount: number;
  resultCount: number;
  scoredCount: number;
  avgScore: number | null;
  minScore: number | null;
  maxScore: number | null;
  lastRunAt: Date | null;
}> {
  const client = getClient(params.tx);

  const result = await client.$queryRaw<
    Array<{
      run_count: bigint;
      result_count: bigint;
      scored_count: bigint;
      avg_score: number | null;
      min_score: number | null;
      max_score: number | null;
      last_run_at: Date | null;
    }>
  >`
    SELECT
      COUNT(DISTINCT run_id) as run_count,
      COUNT(*) as result_count,
      COUNT(score_value) as scored_count,
      AVG(score_value) as avg_score,
      MIN(score_value) as min_score,
      MAX(score_value) as max_score,
      MAX(created_at) as last_run_at
    FROM tst_results
    WHERE agent_id = ${params.agentId}::uuid
  `;

  const row = result[0];
  return {
    runCount: Number(row?.run_count ?? 0),
    resultCount: Number(row?.result_count ?? 0),
    scoredCount: Number(row?.scored_count ?? 0),
    avgScore: row?.avg_score ? Number(row.avg_score) : null,
    minScore: row?.min_score ? Number(row.min_score) : null,
    maxScore: row?.max_score ? Number(row.max_score) : null,
    lastRunAt: row?.last_run_at ?? null,
  };
}

export type GetAgentOverviewParams = {
  agentId: string;
  tx?: Prisma.TransactionClient;
};
