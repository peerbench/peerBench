import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ResultExplorerRow } from "../../types";
import {
  normalizeResultExplorerRow,
  type RawResultExplorerRow,
} from "./_raw-result-helpers";

export async function listAllResults(
  params: ListAllResultsParams = {}
): Promise<{ results: ResultExplorerRow[]; total: number }> {
  const {
    configId,
    configName,
    testCaseId,
    resultId,
    runId,
    agentId,
    status,
    scoreMin,
    scoreMax,
    runner,
    scorer,
    limit = 50,
    offset = 0,
  } = params;
  const client = getClient(params.tx);

  const conditions: Prisma.Sql[] = [];

  if (resultId) {
    conditions.push(Prisma.sql`res.id = ${resultId}::uuid`);
  }
  if (runId) {
    conditions.push(Prisma.sql`res.run_id = ${runId}::uuid`);
  }
  if (agentId) {
    conditions.push(Prisma.sql`res.agent_id = ${agentId}::uuid`);
  }
  if (status) {
    conditions.push(Prisma.sql`res.status = ${status}`);
  }
  if (scoreMin !== undefined) {
    conditions.push(Prisma.sql`res.score_value >= ${scoreMin}`);
  }
  if (scoreMax !== undefined) {
    conditions.push(Prisma.sql`res.score_value <= ${scoreMax}`);
  }
  if (testCaseId) {
    conditions.push(
      Prisma.sql`(res.test_case_id ILIKE ${"%" + testCaseId + "%"} OR res.pure_test_case_id ILIKE ${"%" + testCaseId + "%"})`
    );
  }
  if (configId) {
    conditions.push(Prisma.sql`r.config_id = ${configId}::uuid`);
  }
  if (configName) {
    conditions.push(Prisma.sql`c.name ILIKE ${"%" + configName + "%"}`);
  }
  if (runner) {
    conditions.push(Prisma.sql`r.config_snapshot->>'runner' = ${runner}`);
  }
  if (scorer) {
    conditions.push(
      Prisma.sql`r.config_snapshot->'scorer'->>'type' = ${scorer}`
    );
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const [rows, countResult] = await Promise.all([
    client.$queryRaw<RawResultExplorerRow[]>`
      SELECT
        res.id,
        res.run_id,
        res.test_case_id,
        res.agent_id,
        a.agent_id as agent_name,
        a.endpoint_url as agent_endpoint_url,
        a.provider as agent_provider,
        res.status,
        res.error_message,
        res.response,
        res.score,
        res.test_case,
        res.score_value,
        res.duration_ms,
        res.ttft_ms,
        res.input_tokens_used,
        res.output_tokens_used,
        res.created_at,
        r.config_id,
        c.name as config_name,
        r.config_snapshot->>'runner' as runner,
        r.config_snapshot->'scorer'->>'type' as scorer
      FROM tst_results res
      INNER JOIN tst_runs r ON res.run_id = r.id
      LEFT JOIN tst_agents a ON res.agent_id = a.id
      LEFT JOIN tst_configs c ON r.config_id = c.id
      ${whereClause}
      ORDER BY res.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `,
    client.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM tst_results res
      INNER JOIN tst_runs r ON res.run_id = r.id
      LEFT JOIN tst_agents a ON res.agent_id = a.id
      LEFT JOIN tst_configs c ON r.config_id = c.id
      ${whereClause}
    `,
  ]);

  return {
    results: rows.map(normalizeResultExplorerRow),
    total: Number(countResult[0].count),
  };
}

export type ListAllResultsParams = {
  configId?: string;
  configName?: string;
  testCaseId?: string;
  resultId?: string;
  runId?: string;
  agentId?: string;
  status?: string;
  scoreMin?: number;
  scoreMax?: number;
  runner?: string;
  scorer?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
