import { Prisma } from "@prisma/client";
import { getClient, daysAgo } from "../../helpers";
import type { FeedbackWithContext } from "../../types";

export async function listFeedback(
  params: ListFeedbackParams
): Promise<{ items: FeedbackWithContext[]; total: number }> {
  const client = getClient(params.tx);
  const limit = params.limit ?? 50;
  const offset = params.offset ?? 0;

  const whereConditions: string[] = ["1=1"];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (params.configId) {
    whereConditions.push(`c.id = $${paramIndex}::uuid`);
    queryParams.push(params.configId);
    paramIndex++;
  }

  if (params.sentiment) {
    whereConditions.push(`f.sentiment = $${paramIndex}`);
    queryParams.push(params.sentiment);
    paramIndex++;
  }

  if (params.days) {
    whereConditions.push(`f.created_at >= $${paramIndex}::timestamptz`);
    queryParams.push(daysAgo(params.days));
    paramIndex++;
  }

  const whereClause = whereConditions.join(" AND ");

  const countQuery = `
    SELECT COUNT(*)::int as count
    FROM tst_feedback f
    INNER JOIN tst_results res ON f.result_id = res.id
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE ${whereClause}
  `;

  const dataQuery = `
    SELECT
      f.id,
      f.result_id,
      f.sentiment,
      f.comment,
      f.name,
      f.user_id,
      f.created_at,
      c.id as config_id,
      c.name as config_name,
      r.config_snapshot->>'runner' as runner,
      r.config_snapshot->'scorer'->>'type' as scorer,
      res.score_value,
      res.run_id
    FROM tst_feedback f
    INNER JOIN tst_results res ON f.result_id = res.id
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE ${whereClause}
    ORDER BY f.created_at DESC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  const [countRows, rows] = await Promise.all([
    client.$queryRawUnsafe<Array<{ count: number }>>(
      countQuery,
      ...queryParams
    ),
    client.$queryRawUnsafe<RawFeedbackWithContext[]>(
      dataQuery,
      ...queryParams,
      limit,
      offset
    ),
  ]);

  return {
    items: rows.map(normalizeFeedbackWithContext),
    total: countRows[0]?.count ?? 0,
  };
}

function normalizeFeedbackWithContext(
  raw: RawFeedbackWithContext
): FeedbackWithContext {
  return {
    id: raw.id,
    resultId: raw.result_id,
    runId: raw.run_id,
    sentiment: raw.sentiment,
    comment: raw.comment,
    name: raw.name,
    userId: raw.user_id,
    createdAt: raw.created_at,
    configId: raw.config_id,
    configName: raw.config_name,
    runner: raw.runner,
    scorer: raw.scorer,
    scoreValue: raw.score_value,
  };
}

type RawFeedbackWithContext = {
  id: string;
  result_id: string;
  sentiment: string;
  comment: string | null;
  name: string;
  user_id: string | null;
  created_at: Date;
  config_id: string | null;
  config_name: string | null;
  runner: string | null;
  scorer: string | null;
  score_value: number | null;
  run_id: string;
};

export type ListFeedbackParams = {
  configId?: string;
  sentiment?: "positive" | "negative";
  days?: number;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
