import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getAgentMetrics(
  params: GetAgentMetricsParams = {}
): Promise<
  Array<{
    agentId: string;
    agentName: string;
    agentProvider: string;
    agentEndpointUrl: string;
    runCount: number;
    avgScore: number | null;
    lastRunAt: Date | null;
  }>
> {
  const client = getClient(params.tx);

  const agents = await client.agent.findMany({
    include: {
      results: {
        select: {
          scoreValue: true,
          createdAt: true,
        },
      },
    },
    orderBy: { agentId: "asc" },
  });

  return agents.map((agent) => {
    const scores = agent.results
      .map((r) => r.scoreValue)
      .filter((s): s is number => s !== null);
    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : null;
    const lastRunAt =
      agent.results.length > 0
        ? agent.results.reduce(
            (max, r) => (r.createdAt > max ? r.createdAt : max),
            agent.results[0].createdAt
          )
        : null;

    return {
      agentId: agent.id,
      agentName: agent.name || agent.agentId,
      agentProvider: agent.provider,
      agentEndpointUrl: agent.endpointUrl,
      runCount: agent.results.length,
      avgScore,
      lastRunAt,
    };
  });
}

export type GetAgentMetricsParams = {
  tx?: Prisma.TransactionClient;
};
