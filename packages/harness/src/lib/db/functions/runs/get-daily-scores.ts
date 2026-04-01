import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getDailyScores(
  params: GetDailyScoresParams = {}
): Promise<
  Array<{
    date: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    count: number;
  }>
> {
  const { days = 30 } = params;
  const client = getClient(params.tx);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const results = await client.$queryRaw<
    Array<{
      date: string;
      avg_score: number;
      min_score: number;
      max_score: number;
      count: bigint;
    }>
  >`
    SELECT
      DATE(res.created_at)::text as date,
      AVG(res.score_value) as avg_score,
      MIN(res.score_value) as min_score,
      MAX(res.score_value) as max_score,
      COUNT(*) as count
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    WHERE res.created_at >= ${startDate}
      AND res.score_value IS NOT NULL
      AND (r.metadata->>'isPracticeRun' IS NULL OR r.metadata->>'isPracticeRun' != 'true')
    GROUP BY DATE(res.created_at)
    ORDER BY DATE(res.created_at)
  `;

  return results.map((r) => ({
    date: r.date,
    avgScore: Number(r.avg_score) || 0,
    minScore: Number(r.min_score) || 0,
    maxScore: Number(r.max_score) || 0,
    count: Number(r.count),
  }));
}

export type GetDailyScoresParams = {
  days?: number;
  tx?: Prisma.TransactionClient;
};
