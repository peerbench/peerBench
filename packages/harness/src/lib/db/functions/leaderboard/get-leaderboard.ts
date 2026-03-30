import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LeaderboardEntry, RunnerLeaderboard } from "../../types";

export async function getLeaderboard(
  params: GetLeaderboardParams = {}
): Promise<RunnerLeaderboard[]> {
  const { runner, days } = params;
  const client = getClient(params.tx);

  let dateCondition = "";
  if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    dateCondition = `AND res.created_at >= '${startDate.toISOString()}'`;
  }

  let runnerCondition = "";
  if (runner) {
    runnerCondition = `AND r.config_snapshot->>'runner' = '${runner}'`;
  }

  // Get aggregate stats by runner and agent
  const rows = await client.$queryRawUnsafe<
    Array<{
      runner: string;
      agent_id: string;
      agent_name: string;
      agent_provider: string;
      run_count: bigint;
      result_count: bigint;
      scored_count: bigint;
      avg_score: number | null;
      min_score: number | null;
      max_score: number | null;
      avg_duration_ms: number | null;
      min_duration_ms: number | null;
      max_duration_ms: number | null;
      avg_ttft_ms: number | null;
      ttft_count: bigint;
      last_run_at: Date | null;
    }>
  >(`
    SELECT
      r.config_snapshot->>'runner' as runner,
      res.agent_id,
      COALESCE(a.name, a.agent_id) as agent_name,
      a.provider as agent_provider,
      COUNT(DISTINCT res.run_id) as run_count,
      COUNT(*) as result_count,
      COUNT(res.score_value) as scored_count,
      AVG(res.score_value) as avg_score,
      MIN(res.score_value) as min_score,
      MAX(res.score_value) as max_score,
      AVG(res.duration_ms) as avg_duration_ms,
      MIN(res.duration_ms) as min_duration_ms,
      MAX(res.duration_ms) as max_duration_ms,
      AVG(res.ttft_ms) as avg_ttft_ms,
      COUNT(res.ttft_ms) as ttft_count,
      MAX(res.created_at) as last_run_at
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    WHERE res.agent_id IS NOT NULL
      AND r.config_snapshot->>'runner' IS NOT NULL
      AND (r.metadata->>'isPracticeRun' IS NULL OR r.metadata->>'isPracticeRun' != 'true')
      ${dateCondition}
      ${runnerCondition}
    GROUP BY r.config_snapshot->>'runner', res.agent_id, a.id, a.provider
    ORDER BY r.config_snapshot->>'runner', AVG(res.score_value) DESC NULLS LAST
  `);

  // Group by runner
  const runnerMap = new Map<string, LeaderboardEntry[]>();
  const runnerTotals = new Map<
    string,
    { runs: Set<string>; results: number }
  >();

  for (const row of rows) {
    const runnerName = row.runner || "unknown";

    if (!runnerMap.has(runnerName)) {
      runnerMap.set(runnerName, []);
      runnerTotals.set(runnerName, { runs: new Set(), results: 0 });
    }

    runnerMap.get(runnerName)!.push({
      rank: 0, // Will be set after sorting
      agentId: row.agent_id,
      agentName: row.agent_name || "Unknown",
      agentProvider: row.agent_provider || "unknown",
      systemPromptId: null,
      systemPromptVersion: null,
      runCount: Number(row.run_count),
      resultCount: Number(row.result_count),
      scoredCount: Number(row.scored_count),
      avgScore: row.avg_score !== null ? Number(row.avg_score) : null,
      minScore: row.min_score !== null ? Number(row.min_score) : null,
      maxScore: row.max_score !== null ? Number(row.max_score) : null,
      avgDurationMs:
        row.avg_duration_ms !== null ? Number(row.avg_duration_ms) : null,
      minDurationMs:
        row.min_duration_ms !== null ? Number(row.min_duration_ms) : null,
      maxDurationMs:
        row.max_duration_ms !== null ? Number(row.max_duration_ms) : null,
      avgTtftMs: row.avg_ttft_ms !== null ? Number(row.avg_ttft_ms) : null,
      ttftCount: Number(row.ttft_count),
      lastRunAt: row.last_run_at,
    });

    const totals = runnerTotals.get(runnerName)!;
    totals.results += Number(row.result_count);
  }

  // Convert to array and assign ranks
  const result: RunnerLeaderboard[] = [];

  for (const [runnerName, entries] of runnerMap.entries()) {
    // Sort by avgScore descending (nulls last)
    entries.sort((a, b) => {
      if (a.avgScore === null && b.avgScore === null) return 0;
      if (a.avgScore === null) return 1;
      if (b.avgScore === null) return -1;
      return b.avgScore - a.avgScore;
    });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const totals = runnerTotals.get(runnerName)!;

    result.push({
      runner: runnerName,
      entries,
      totalRuns: entries.reduce((sum, e) => sum + e.runCount, 0),
      totalResults: totals.results,
    });
  }

  // Sort runners alphabetically
  result.sort((a, b) => a.runner.localeCompare(b.runner));

  return result;
}

export type GetLeaderboardParams = {
  runner?: string;
  days?: number;
  tx?: Prisma.TransactionClient;
};
