import { Prisma } from "@prisma/client";
import { getClient, daysAgo } from "../../helpers";
import type { FeedbackStats } from "../../types";

export async function getFeedbackStats(
  params: GetFeedbackStatsParams
): Promise<FeedbackStats> {
  const client = getClient(params.tx);
  const days = params.days ?? 30;
  const startDate = daysAgo(days);

  const sentimentByConfigQuery = Prisma.sql`
    SELECT
      c.id as config_id,
      c.name as config_name,
      COUNT(*) FILTER (WHERE f.sentiment = 'positive')::int as positive_count,
      COUNT(*) FILTER (WHERE f.sentiment = 'negative')::int as negative_count,
      COUNT(*)::int as total_count
    FROM tst_feedback f
    INNER JOIN tst_results res ON f.result_id = res.id
    INNER JOIN tst_runs r ON res.run_id = r.id
    INNER JOIN tst_configs c ON r.config_id = c.id
    WHERE f.created_at >= ${startDate}::timestamptz
    GROUP BY c.id, c.name
    ORDER BY total_count DESC
  `;

  const trendsQuery = Prisma.sql`
    SELECT
      DATE(f.created_at) as date,
      COUNT(*) FILTER (WHERE f.sentiment = 'positive')::int as positive_count,
      COUNT(*) FILTER (WHERE f.sentiment = 'negative')::int as negative_count
    FROM tst_feedback f
    WHERE f.created_at >= ${startDate}::timestamptz
    GROUP BY DATE(f.created_at)
    ORDER BY date ASC
  `;

  const totalsQuery = Prisma.sql`
    SELECT
      COUNT(*) FILTER (WHERE sentiment = 'positive')::int as total_positive,
      COUNT(*) FILTER (WHERE sentiment = 'negative')::int as total_negative
    FROM tst_feedback
    WHERE created_at >= ${startDate}::timestamptz
  `;

  const [sentimentByConfig, trends, totals] = await Promise.all([
    client.$queryRaw<RawSentimentByConfig[]>(sentimentByConfigQuery),
    client.$queryRaw<RawTrend[]>(trendsQuery),
    client.$queryRaw<RawTotals[]>(totalsQuery),
  ]);

  return {
    sentimentByConfig: sentimentByConfig.map((row) => ({
      configId: row.config_id,
      configName: row.config_name,
      positiveCount: row.positive_count,
      negativeCount: row.negative_count,
      totalCount: row.total_count,
    })),
    trendsOverTime: trends.map((row) => ({
      date: row.date.toISOString().split("T")[0],
      positiveCount: row.positive_count,
      negativeCount: row.negative_count,
    })),
    totalPositive: totals[0]?.total_positive ?? 0,
    totalNegative: totals[0]?.total_negative ?? 0,
  };
}

type RawSentimentByConfig = {
  config_id: string;
  config_name: string;
  positive_count: number;
  negative_count: number;
  total_count: number;
};

type RawTrend = {
  date: Date;
  positive_count: number;
  negative_count: number;
};

type RawTotals = {
  total_positive: number;
  total_negative: number;
};

export type GetFeedbackStatsParams = {
  days?: number;
  tx?: Prisma.TransactionClient;
};
