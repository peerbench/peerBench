import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getAgentRunPerformance(
  params: GetAgentRunPerformanceParams
): Promise<
  Array<{
    runId: string;
    timestamp: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    resultCount: number;
    scoredCount: number;
    configName: string | null;
  }>
> {
  const { agentId, days = 30, configId, configVersion } = params;
  const client = getClient(params.tx);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  let configCondition = "";
  if (configId === null) {
    configCondition = "AND r.config_id IS NULL";
  } else if (configId) {
    configCondition = `AND r.config_id = '${configId}'`;
  }
  if (configVersion !== undefined && configVersion !== null) {
    configCondition += ` AND r.config_version = ${configVersion}`;
  }

  const results = await client.$queryRawUnsafe<
    Array<{
      run_id: string;
      timestamp: string;
      avg_score: number;
      min_score: number;
      max_score: number;
      result_count: bigint;
      scored_count: bigint;
      config_name: string | null;
    }>
  >(`
    SELECT
      res.run_id,
      MIN(res.created_at)::text as timestamp,
      AVG(res.score_value) as avg_score,
      MIN(res.score_value) as min_score,
      MAX(res.score_value) as max_score,
      COUNT(*) as result_count,
      COUNT(res.score_value) as scored_count,
      c.name as config_name
    FROM tst_results res
    LEFT JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE res.agent_id = '${agentId}'
      AND res.created_at >= '${startDate.toISOString()}'
      ${configCondition}
    GROUP BY res.run_id, c.name
    ORDER BY MIN(res.created_at)
  `);

  return results.map((r) => ({
    runId: r.run_id,
    timestamp: r.timestamp,
    avgScore: Number(r.avg_score) || 0,
    minScore: Number(r.min_score) || 0,
    maxScore: Number(r.max_score) || 0,
    resultCount: Number(r.result_count),
    scoredCount: Number(r.scored_count),
    configName: r.config_name,
  }));
}

export type GetAgentRunPerformanceParams = {
  agentId: string;
  days?: number;
  configId?: string | null;
  configVersion?: number | null;
  tx?: Prisma.TransactionClient;
};
