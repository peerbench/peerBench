import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ConfigDashboardSummary, ConfigDashboardData } from "../../types";

export async function getConfigDashboardSummaries(
  params: GetConfigDashboardSummariesParams
): Promise<ConfigDashboardData> {
  const client = getClient(params.tx);
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);

  const excludePractice = Prisma.sql`AND (r.metadata->>'isPracticeRun')::boolean IS NOT TRUE`;
  const excludePracticeR2 = Prisma.sql`AND (r2.metadata->>'isPracticeRun')::boolean IS NOT TRUE`;

  // Config summaries with latest run
  const configRows = await client.$queryRaw<ConfigDashboardRawRow[]>`
    WITH ranked_runs AS (
      SELECT
        r.id AS run_id,
        r.config_id,
        r.status,
        r.avg_score,
        r.total_test_cases,
        r.completed_test_cases,
        r.created_at,
        ROW_NUMBER() OVER (PARTITION BY r.config_id ORDER BY r.created_at DESC) AS rn
      FROM tst_runs r
      WHERE r.config_id IS NOT NULL
        ${excludePractice}
    )
    SELECT
      c.id AS config_id,
      c.name AS config_name,
      c.version AS config_version,
      c.initial_config_id,
      c.tags,
      c.is_favorite,
      rr.run_id AS last_run_id,
      rr.status AS last_run_status,
      rr.avg_score AS last_run_score,
      rr.total_test_cases AS last_run_total_test_cases,
      rr.completed_test_cases AS last_run_completed_test_cases,
      rr.created_at AS last_run_at,
      COALESCE(week_counts.runs_this_week, 0) AS runs_this_week,
      COALESCE(week_counts.failed_runs_this_week, 0) AS failed_runs_this_week,
      COALESCE(week_counts.partial_runs_this_week, 0) AS partial_runs_this_week
    FROM tst_configs c
    LEFT JOIN ranked_runs rr ON rr.config_id = c.id AND rr.rn = 1
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS runs_this_week,
        SUM(CASE WHEN r2.status = 'failed' THEN 1 ELSE 0 END)::int AS failed_runs_this_week,
        SUM(CASE WHEN r2.status = 'partial' THEN 1 ELSE 0 END)::int AS partial_runs_this_week
      FROM tst_runs r2
      WHERE r2.config_id = c.id
        AND r2.created_at >= ${thisWeekStart}
        ${excludePracticeR2}
    ) week_counts ON TRUE
    ORDER BY rr.created_at DESC NULLS LAST, c.name ASC
  `;

  const configIds = configRows.map((r) => r.config_id);

  // Sparkline data - last 5 non-practice runs per config
  const sparklineRows =
    configIds.length > 0
      ? await client.$queryRaw<SparklineRawRow[]>`
      WITH ranked AS (
        SELECT
          r.config_id,
          r.id AS run_id,
          r.avg_score AS score,
          r.status,
          r.created_at,
          ROW_NUMBER() OVER (PARTITION BY r.config_id ORDER BY r.created_at DESC) AS rn
        FROM tst_runs r
        WHERE r.config_id = ANY(${configIds}::uuid[])
          ${excludePractice}
      )
      SELECT config_id, run_id, score, status, created_at
      FROM ranked
      WHERE rn <= 5
      ORDER BY config_id, created_at ASC
    `
      : [];

  // Per-target breakdown for latest run of each config
  const latestRunIds = configRows
    .filter((r) => r.last_run_id !== null)
    .map((r) => r.last_run_id!);

  const targetRows =
    latestRunIds.length > 0
      ? await client.$queryRaw<TargetBreakdownRawRow[]>`
      SELECT
        res.run_id,
        COALESCE(a.name, a.agent_id, 'unknown') AS target,
        AVG(res.score_value) AS avg_score,
        COUNT(*)::int AS result_count,
        SUM(CASE WHEN res.status = 'failed' THEN 1 ELSE 0 END)::int AS failed_count
      FROM tst_results res
      LEFT JOIN tst_agents a ON res.agent_id = a.id
      WHERE res.run_id = ANY(${latestRunIds}::uuid[])
      GROUP BY res.run_id, a.id, COALESCE(a.name, a.agent_id, 'unknown')
      ORDER BY res.run_id, result_count DESC
    `
      : [];

  // Runs last week (for delta calculation)
  const runsLastWeekResult = await client.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count
    FROM tst_runs r
    WHERE r.created_at >= ${lastWeekStart}
      AND r.created_at < ${thisWeekStart}
      AND r.config_id IS NOT NULL
      ${excludePractice}
  `;

  const totalRunsThisWeek = configRows.reduce(
    (sum, r) => sum + Number(r.runs_this_week),
    0
  );
  const totalFailedThisWeek = configRows.reduce(
    (sum, r) => sum + Number(r.failed_runs_this_week),
    0
  );
  const totalPartialThisWeek = configRows.reduce(
    (sum, r) => sum + Number(r.partial_runs_this_week),
    0
  );
  const activeConfigs = configRows.filter(
    (r) => Number(r.runs_this_week) > 0
  ).length;

  // Build sparkline map: configId -> sparkline points
  const sparklineMap = new Map<string, ConfigDashboardSummary["sparkline"]>();
  for (const row of sparklineRows) {
    const key = row.config_id;
    if (!sparklineMap.has(key)) {
      sparklineMap.set(key, []);
    }
    sparklineMap.get(key)!.push({
      runId: row.run_id,
      score: row.score !== null ? Number(row.score) : null,
      status: row.status,
      createdAt: new Date(row.created_at).toISOString(),
    });
  }

  // Build target breakdown map: runId -> target breakdowns
  const targetMap = new Map<
    string,
    ConfigDashboardSummary["targetBreakdown"]
  >();
  for (const row of targetRows) {
    const key = row.run_id;
    if (!targetMap.has(key)) {
      targetMap.set(key, []);
    }
    targetMap.get(key)!.push({
      target: row.target,
      avgScore: row.avg_score !== null ? Number(row.avg_score) : null,
      resultCount: Number(row.result_count),
      failedCount: Number(row.failed_count),
    });
  }

  // Build config summaries with regression detection
  let regressionsDetected = 0;
  const configSummaries: ConfigDashboardSummary[] = configRows.map((row) => {
    const sparkline = sparklineMap.get(row.config_id) ?? [];
    const targetBreakdown = row.last_run_id
      ? (targetMap.get(row.last_run_id) ?? [])
      : [];

    let isRegressed = false;
    const scoredPoints = sparkline.filter((p) => p.score !== null);
    if (scoredPoints.length >= 2) {
      const latestScore = scoredPoints[scoredPoints.length - 1].score!;
      const prevScores = scoredPoints.slice(0, -1).map((p) => p.score!);
      const prevAvg = prevScores.reduce((a, b) => a + b, 0) / prevScores.length;
      if (latestScore < prevAvg - 0.05) {
        isRegressed = true;
        regressionsDetected++;
      }
    }

    return {
      configId: row.config_id,
      configName: row.config_name,
      configVersion: Number(row.config_version),
      initialConfigId: row.initial_config_id,
      tags: row.tags ?? [],
      isFavorite: row.is_favorite,
      lastRunId: row.last_run_id,
      lastRunStatus: row.last_run_status,
      lastRunScore:
        row.last_run_score !== null ? Number(row.last_run_score) : null,
      lastRunTotalTestCases:
        row.last_run_total_test_cases !== null
          ? Number(row.last_run_total_test_cases)
          : null,
      lastRunCompletedTestCases:
        row.last_run_completed_test_cases !== null
          ? Number(row.last_run_completed_test_cases)
          : null,
      lastRunAt:
        row.last_run_at !== null
          ? new Date(row.last_run_at).toISOString()
          : null,
      runsThisWeek: Number(row.runs_this_week),
      failedRunsThisWeek: Number(row.failed_runs_this_week),
      isRegressed,
      sparkline,
      targetBreakdown,
    };
  });

  return {
    operationalStats: {
      activeConfigs,
      totalConfigs: configRows.length,
      runsThisWeek: totalRunsThisWeek,
      runsLastWeek: Number(runsLastWeekResult[0]?.count ?? 0),
      failedRunsThisWeek: totalFailedThisWeek,
      partialRunsThisWeek: totalPartialThisWeek,
      regressionsDetected,
    },
    configSummaries,
  };
}

interface ConfigDashboardRawRow {
  config_id: string;
  config_name: string;
  config_version: number;
  initial_config_id: string | null;
  tags: string[];
  is_favorite: boolean;
  last_run_id: string | null;
  last_run_status: string | null;
  last_run_score: number | null;
  last_run_total_test_cases: number | null;
  last_run_completed_test_cases: number | null;
  last_run_at: Date | null;
  runs_this_week: number;
  failed_runs_this_week: number;
  partial_runs_this_week: number;
}

interface SparklineRawRow {
  config_id: string;
  run_id: string;
  score: number | null;
  status: string;
  created_at: Date;
}

interface TargetBreakdownRawRow {
  run_id: string;
  target: string;
  avg_score: number | null;
  result_count: number;
  failed_count: number;
}

export type GetConfigDashboardSummariesParams = {
  tx?: Prisma.TransactionClient;
};
