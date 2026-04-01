import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function listAgentConfigTestCasePerformance(
  params: ListAgentConfigTestCasePerformanceParams
): Promise<{
  rows: Array<{
    configId: string | null;
    testCaseId: string;
    testCaseName: string | null;
    runCount: number;
    resultCount: number;
    scoredCount: number;
    avgScore: number | null;
    lastRunAt: Date | null;
  }>;
}> {
  const { agentId, configId, limit = 200, offset = 0 } = params;
  const client = getClient(params.tx);

  let configCondition = "";
  if (configId === null) {
    configCondition = "AND r.config_id IS NULL";
  } else if (typeof configId === "string") {
    configCondition = `AND r.config_id = '${configId}'`;
  }

  const rows = await client.$queryRawUnsafe<
    Array<{
      config_id: string | null;
      test_case_id: string;
      test_case_name: string | null;
      run_count: bigint;
      result_count: bigint;
      scored_count: bigint;
      avg_score: number | null;
      last_run_at: Date | null;
    }>
  >(`
    SELECT
      r.config_id,
      res.test_case_id,
      tc.name as test_case_name,
      COUNT(DISTINCT res.run_id) as run_count,
      COUNT(*) as result_count,
      COUNT(res.score_value) as scored_count,
      AVG(res.score_value) as avg_score,
      MAX(res.created_at) as last_run_at
    FROM tst_results res
    LEFT JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_test_cases tc ON tc.id::text = res.test_case_id
    WHERE res.agent_id = '${agentId}'
      ${configCondition}
    GROUP BY r.config_id, res.test_case_id, tc.name
    ORDER BY COUNT(DISTINCT res.run_id) DESC
    LIMIT ${limit} OFFSET ${offset}
  `);

  return {
    rows: rows.map((r) => ({
      configId: r.config_id,
      testCaseId: r.test_case_id,
      testCaseName: r.test_case_name ?? null,
      runCount: Number(r.run_count),
      resultCount: Number(r.result_count),
      scoredCount: Number(r.scored_count),
      avgScore: r.avg_score ? Number(r.avg_score) : null,
      lastRunAt: r.last_run_at ?? null,
    })),
  };
}

export type ListAgentConfigTestCasePerformanceParams = {
  agentId: string;
  configId?: string | null;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
