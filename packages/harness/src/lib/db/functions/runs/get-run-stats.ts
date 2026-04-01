import { Prisma } from "@prisma/client";
import { excludePracticeRunsWhere, getClient } from "../../helpers";

export async function getRunStats(params: GetRunStatsParams = {}): Promise<{
  totalRuns: number;
  completedRuns: number;
  avgScore: number | null;
  totalTestCases: number;
}> {
  const client = getClient(params.tx);

  const [totalRuns, completedRuns, avgResult, tcResult] = await Promise.all([
    client.run.count({ where: excludePracticeRunsWhere }),
    client.run.count({
      where: { status: "completed", ...excludePracticeRunsWhere },
    }),
    client.run.aggregate({
      where: excludePracticeRunsWhere,
      _avg: { avgScore: true },
    }),
    client.run.aggregate({
      where: excludePracticeRunsWhere,
      _sum: { totalTestCases: true },
    }),
  ]);

  return {
    totalRuns,
    completedRuns,
    avgScore: avgResult._avg.avgScore,
    totalTestCases: tcResult._sum.totalTestCases || 0,
  };
}

export type GetRunStatsParams = {
  tx?: Prisma.TransactionClient;
};
