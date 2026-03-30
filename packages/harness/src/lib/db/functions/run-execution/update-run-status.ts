import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Run } from "../../types";

export async function updateRunStatus(
  params: UpdateRunStatusParams
): Promise<Run | null> {
  const client = getClient(params.tx);
  return client.run.update({
    where: { id: params.id },
    data: {
      status: params.status,
      startedAt: params.startedAt,
      completedAt: params.completedAt,
      errorMessage: params.errorMessage,
      totalTestCases: params.totalTestCases,
      completedTestCases: params.completedTestCases,
      successfulTestCases: params.successfulTestCases,
      failedTestCases: params.failedTestCases,
      avgScore: params.avgScore,
      minScore: params.minScore,
      maxScore: params.maxScore,
      totalDurationMs: params.totalDurationMs,
    },
  });
}

export type UpdateRunStatusParams = {
  id: string;
  status?: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  totalTestCases?: number;
  completedTestCases?: number;
  successfulTestCases?: number;
  failedTestCases?: number;
  avgScore?: number;
  minScore?: number;
  maxScore?: number;
  totalDurationMs?: number;
  tx?: Prisma.TransactionClient;
};
