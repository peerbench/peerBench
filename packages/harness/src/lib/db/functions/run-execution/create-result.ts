import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Result } from "../../types";

export async function createResult(
  params: CreateResultParams
): Promise<Result> {
  const client = getClient(params.tx);
  const { tx: _tx, ...data } = params;
  return client.result.create({
    data: {
      ...data,
      response: data.response as Prisma.InputJsonValue | undefined,
      score: data.score as Prisma.InputJsonValue | undefined,
      testCase: data.testCase as Prisma.InputJsonValue | undefined,
    },
  });
}

export type CreateResultParams = {
  runId: string;
  testCaseId: string;
  pureTestCaseId?: string;
  agentId?: string;
  systemPromptId?: string;
  systemPromptHash?: string;
  systemPromptVersion?: number;
  status: string;
  errorMessage?: string;
  response?: Record<string, unknown>;
  score?: Record<string, unknown>;
  testCase?: Record<string, unknown>;
  scoreValue?: number;
  inputTokensUsed?: number;
  outputTokensUsed?: number;
  inputCost?: string;
  outputCost?: string;
  durationMs?: number;
  ttftMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  tx?: Prisma.TransactionClient;
};
