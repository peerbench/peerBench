import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { AgentWithHealthCheck } from "../../types";

export async function listAgents(
  params: ListAgentsParams = {}
): Promise<{ agents: AgentWithHealthCheck[]; total: number }> {
  const { search, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const where = search
    ? {
        OR: [
          { agentId: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
          {
            description: { contains: search, mode: "insensitive" as const },
          },
        ],
      }
    : {};

  const [rawAgents, total] = await Promise.all([
    client.agent.findMany({
      where,
      orderBy: { agentId: "asc" },
      take: limit,
      skip: offset,
      include: {
        healthCheckResults: {
          orderBy: { checkedAt: "desc" },
          take: 1,
        },
      },
    }),
    client.agent.count({ where }),
  ]);

  const agents: AgentWithHealthCheck[] = rawAgents.map((a) => {
    const { healthCheckResults, ...rest } = a;
    return {
      ...rest,
      lastHealthCheck: healthCheckResults[0] ?? null,
    };
  });

  return { agents, total };
}

export type ListAgentsParams = {
  search?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
