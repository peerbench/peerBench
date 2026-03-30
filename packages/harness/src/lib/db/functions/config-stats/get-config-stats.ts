import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ConfigTargetSummary, ConfigStats } from "../../types";

export async function getConfigStats(
  params: GetConfigStatsParams
): Promise<ConfigStats> {
  const { configId, days = 30 } = params;
  const client = getClient(params.tx);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const dailyResults = await client.$queryRaw<
    Array<{
      date: string;
      target: string;
      avg_score: number;
      min_score: number;
      max_score: number;
      count: bigint;
      failed_count: bigint;
    }>
  >`
    SELECT
      DATE(res.created_at)::text as date,
      COALESCE(a.name, a.agent_id, 'unknown') as target,
      AVG(res.score_value) as avg_score,
      MIN(res.score_value) as min_score,
      MAX(res.score_value) as max_score,
      COUNT(*) as count,
      SUM(CASE WHEN res.status = 'failed' THEN 1 ELSE 0 END) as failed_count
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    WHERE r.config_id = ${configId}::uuid
      AND res.created_at >= ${startDate}
    GROUP BY DATE(res.created_at), a.id
    ORDER BY DATE(res.created_at), COALESCE(a.name, a.agent_id, 'unknown')
  `;

  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);

  const thisWeekResults = await client.$queryRaw<
    Array<{
      target: string;
      avg_score: number | null;
      count: bigint;
      failed_count: bigint;
    }>
  >`
    SELECT
      COALESCE(a.name, a.agent_id, 'unknown') as target,
      AVG(res.score_value) as avg_score,
      COUNT(*) as count,
      SUM(CASE WHEN res.status = 'failed' THEN 1 ELSE 0 END) as failed_count
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    WHERE r.config_id = ${configId}::uuid
      AND res.created_at >= ${thisWeekStart}
    GROUP BY a.id
  `;

  const lastWeekResults = await client.$queryRaw<
    Array<{
      target: string;
      avg_score: number | null;
      count: bigint;
      failed_count: bigint;
    }>
  >`
    SELECT
      COALESCE(a.name, a.agent_id, 'unknown') as target,
      AVG(res.score_value) as avg_score,
      COUNT(*) as count,
      SUM(CASE WHEN res.status = 'failed' THEN 1 ELSE 0 END) as failed_count
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    WHERE r.config_id = ${configId}::uuid
      AND res.created_at >= ${lastWeekStart}
      AND res.created_at < ${thisWeekStart}
    GROUP BY a.id
  `;

  const thisWeekMap = new Map(thisWeekResults.map((r) => [r.target, r]));
  const lastWeekMap = new Map(lastWeekResults.map((r) => [r.target, r]));
  const allTargets = new Set([...thisWeekMap.keys(), ...lastWeekMap.keys()]);

  const targetSummaries: ConfigTargetSummary[] = Array.from(allTargets)
    .map((target) => {
      const tw = thisWeekMap.get(target);
      const lw = lastWeekMap.get(target);
      const thisWeekAvg = tw?.avg_score ? Number(tw.avg_score) : null;
      const lastWeekAvg = lw?.avg_score ? Number(lw.avg_score) : null;
      const change =
        thisWeekAvg !== null && lastWeekAvg !== null
          ? thisWeekAvg - lastWeekAvg
          : null;

      return {
        target,
        thisWeek: {
          avgScore: thisWeekAvg,
          count: Number(tw?.count || 0),
          failedCount: Number(tw?.failed_count || 0),
        },
        lastWeek: {
          avgScore: lastWeekAvg,
          count: Number(lw?.count || 0),
          failedCount: Number(lw?.failed_count || 0),
        },
        change,
      };
    })
    .sort((a, b) => b.thisWeek.count - a.thisWeek.count);

  const overallResult = await client.run.aggregate({
    where: { configId },
    _count: true,
    _avg: { avgScore: true },
  });

  const completedRuns = await client.run.count({
    where: { configId, status: "completed" },
  });

  return {
    dailyScoresByTarget: dailyResults.map((r) => ({
      date: r.date,
      target: r.target,
      avgScore: Number(r.avg_score) || 0,
      minScore: Number(r.min_score) || 0,
      maxScore: Number(r.max_score) || 0,
      count: Number(r.count),
      failedCount: Number(r.failed_count),
    })),
    targetSummaries,
    overallStats: {
      totalRuns: overallResult._count || 0,
      completedRuns,
      avgScore: overallResult._avg.avgScore,
    },
  };
}

export type GetConfigStatsParams = {
  configId: string;
  days?: number;
  tx?: Prisma.TransactionClient;
};
