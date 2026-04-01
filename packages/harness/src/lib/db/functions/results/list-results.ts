import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ResultListRow } from "../../types";

export async function listResults(
  params: ListResultsParams
): Promise<{ results: ResultListRow[]; total: number }> {
  const { runId, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const [results, total] = await Promise.all([
    client.result.findMany({
      where: { runId },
      include: { agent: true },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    }),
    client.result.count({ where: { runId } }),
  ]);

  return {
    results: results.map((r) => ({
      id: r.id,
      runId: r.runId,
      testCaseId: r.testCaseId,
      agentId: r.agentId,
      modelSlug: r.agent?.agentId || null,
      agentEndpointUrl: r.agent?.endpointUrl || null,
      agentProvider: r.agent?.provider || null,
      status: r.status,
      errorMessage: r.errorMessage,
      response: r.response as Record<string, unknown> | null,
      score: r.score as Record<string, unknown> | null,
      testCase: r.testCase as Record<string, unknown> | null,
      scoreValue: r.scoreValue,
      durationMs: r.durationMs,
      ttftMs: r.ttftMs,
      inputTokensUsed: r.inputTokensUsed,
      outputTokensUsed: r.outputTokensUsed,
      createdAt: r.createdAt,
    })),
    total,
  };
}

export type ListResultsParams = {
  runId: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
