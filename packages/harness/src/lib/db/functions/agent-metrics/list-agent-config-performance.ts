import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function listAgentConfigPerformance(
  params: ListAgentConfigPerformanceParams
): Promise<{
  rows: Array<{
    configId: string | null;
    configName: string | null;
    configVersion: number | null;
    runCount: number;
    resultCount: number;
    scoredCount: number;
    avgScore: number | null;
    lastRunAt: Date | null;
  }>;
}> {
  const { agentId, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const rows = await client.$queryRaw<
    Array<{
      config_id: string | null;
      config_name: string | null;
      config_version: number | null;
      run_count: bigint;
      result_count: bigint;
      scored_count: bigint;
      avg_score: number | null;
      last_run_at: Date | null;
    }>
  >`
    SELECT
      r.config_id,
      c.name as config_name,
      r.config_version,
      COUNT(DISTINCT res.run_id) as run_count,
      COUNT(*) as result_count,
      COUNT(res.score_value) as scored_count,
      AVG(res.score_value) as avg_score,
      MAX(res.created_at) as last_run_at
    FROM tst_results res
    LEFT JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE res.agent_id = ${agentId}::uuid
    GROUP BY r.config_id, c.name, r.config_version
    ORDER BY COUNT(DISTINCT res.run_id) DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return {
    rows: rows.map((r) => ({
      configId: r.config_id,
      configName: r.config_name ?? null,
      configVersion: r.config_version ?? null,
      runCount: Number(r.run_count),
      resultCount: Number(r.result_count),
      scoredCount: Number(r.scored_count),
      avgScore: r.avg_score ? Number(r.avg_score) : null,
      lastRunAt: r.last_run_at ?? null,
    })),
  };
}

export type ListAgentConfigPerformanceParams = {
  agentId: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
