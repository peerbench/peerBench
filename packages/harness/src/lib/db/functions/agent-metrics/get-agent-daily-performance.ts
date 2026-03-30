import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getAgentDailyPerformance(
  params: GetAgentDailyPerformanceParams
): Promise<
  Array<{
    date: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    count: number;
    scoredCount: number;
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
      date: string;
      avg_score: number;
      min_score: number;
      max_score: number;
      count: bigint;
      scored_count: bigint;
    }>
  >(`
    SELECT
      DATE(res.created_at)::text as date,
      AVG(res.score_value) as avg_score,
      MIN(res.score_value) as min_score,
      MAX(res.score_value) as max_score,
      COUNT(*) as count,
      COUNT(res.score_value) as scored_count
    FROM tst_results res
    LEFT JOIN tst_runs r ON res.run_id = r.id
    WHERE res.agent_id = '${agentId}'
      AND res.created_at >= '${startDate.toISOString()}'
      ${configCondition}
    GROUP BY DATE(res.created_at)
    ORDER BY DATE(res.created_at)
  `);

  return results.map((r) => ({
    date: r.date,
    avgScore: Number(r.avg_score) || 0,
    minScore: Number(r.min_score) || 0,
    maxScore: Number(r.max_score) || 0,
    count: Number(r.count),
    scoredCount: Number(r.scored_count),
  }));
}

export type GetAgentDailyPerformanceParams = {
  agentId: string;
  days?: number;
  configId?: string | null;
  configVersion?: number | null;
  tx?: Prisma.TransactionClient;
};
