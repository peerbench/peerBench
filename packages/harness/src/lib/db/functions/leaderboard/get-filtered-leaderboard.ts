import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LeaderboardEntry, LeaderboardFilterParams } from "../../types";

export async function getFilteredLeaderboard(
  params: GetFilteredLeaderboardParams = {}
): Promise<LeaderboardEntry[]> {
  const {
    tags,
    tagMode = "or",
    runner,
    scorer,
    days,
    minutes,
    configId,
    provider,
    agentId,
    minResults,
    compareAgents,
    groupByPromptVersion,
  } = params;
  const client = getClient(params.tx);

  const conditions: string[] = [
    "res.agent_id IS NOT NULL",
    // Exclude practice runs from leaderboard by default
    "(r.metadata->>'isPracticeRun' IS NULL OR r.metadata->>'isPracticeRun' != 'true')",
  ];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  // Handle time-based filtering (minutes takes precedence over days)
  if (minutes) {
    const startDate = new Date();
    startDate.setTime(startDate.getTime() - minutes * 60 * 1000);
    conditions.push(`res.created_at >= $${paramIndex}::timestamptz`);
    queryParams.push(startDate);
    paramIndex++;
  } else if (days) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    conditions.push(`res.created_at >= $${paramIndex}::timestamptz`);
    queryParams.push(startDate);
    paramIndex++;
  }

  if (runner) {
    conditions.push(`r.config_snapshot->>'runner' = $${paramIndex}`);
    queryParams.push(runner);
    paramIndex++;
  }

  if (scorer) {
    conditions.push(`r.config_snapshot->>'scorer' = $${paramIndex}`);
    queryParams.push(scorer);
    paramIndex++;
  }

  if (configId) {
    conditions.push(`r.config_id = $${paramIndex}::uuid`);
    queryParams.push(configId);
    paramIndex++;
  }

  if (provider) {
    conditions.push(`a.provider = $${paramIndex}`);
    queryParams.push(provider);
    paramIndex++;
  }

  if (agentId) {
    conditions.push(`res.agent_id = $${paramIndex}::uuid`);
    queryParams.push(agentId);
    paramIndex++;
  }

  if (tags && tags.length > 0) {
    if (tagMode === "and") {
      conditions.push(`c.tags @> $${paramIndex}::text[]`);
    } else {
      conditions.push(`c.tags && $${paramIndex}::text[]`);
    }
    queryParams.push(tags);
    paramIndex++;
  }

  if (compareAgents && compareAgents.length > 1) {
    conditions.push(`res.agent_id = ANY($${paramIndex}::uuid[])`);
    queryParams.push(compareAgents);
    paramIndex++;

    // Only include test cases where ALL selected agents have results
    // Use pure_test_case_id which is the actual test case ID without agent suffix
    const commonTestCasesSubquery = `
      res.pure_test_case_id IS NOT NULL AND res.pure_test_case_id IN (
        SELECT tc_res.pure_test_case_id
        FROM tst_results tc_res
        WHERE tc_res.agent_id = ANY($${paramIndex}::uuid[])
          AND tc_res.pure_test_case_id IS NOT NULL
        GROUP BY tc_res.pure_test_case_id
        HAVING COUNT(DISTINCT tc_res.agent_id) = $${paramIndex + 1}
      )
    `;
    conditions.push(commonTestCasesSubquery);
    queryParams.push(compareAgents);
    queryParams.push(compareAgents.length);
    paramIndex += 2;
  }

  const whereClause = conditions.join(" AND ");

  let havingClause = "";
  if (minResults && minResults > 0) {
    havingClause = `HAVING COUNT(*) >= $${paramIndex}`;
    queryParams.push(minResults);
    paramIndex++;
  }

  const promptVersionSelect = groupByPromptVersion
    ? `,\n      res.system_prompt_id,\n      res.system_prompt_version`
    : "";
  const promptVersionGroupBy = groupByPromptVersion
    ? ", res.system_prompt_id, res.system_prompt_version"
    : "";

  const query = `
    SELECT
      res.agent_id,
      COALESCE(a.name, a.agent_id) as agent_name,
      a.provider as agent_provider${promptVersionSelect},
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
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE ${whereClause}
    GROUP BY res.agent_id, a.id, a.provider${promptVersionGroupBy}
    ${havingClause}
    ORDER BY AVG(res.score_value) DESC NULLS LAST
  `;

  const rows = await client.$queryRawUnsafe<
    Array<{
      agent_id: string;
      agent_name: string;
      agent_provider: string;
      system_prompt_id: string | null;
      system_prompt_version: number | null;
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
  >(query, ...queryParams);

  return rows.map((row, index) => ({
    rank: index + 1,
    agentId: row.agent_id,
    agentName: row.agent_name || "Unknown",
    agentProvider: row.agent_provider || "unknown",
    systemPromptId: row.system_prompt_id ?? null,
    systemPromptVersion:
      row.system_prompt_version !== null &&
      row.system_prompt_version !== undefined
        ? Number(row.system_prompt_version)
        : null,
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
  }));
}

export type GetFilteredLeaderboardParams = LeaderboardFilterParams & {
  tx?: Prisma.TransactionClient;
};
