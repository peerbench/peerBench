import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { AgentWithHealthCheck } from "../../types";

export async function getAgent(
  params: GetAgentParams
): Promise<AgentWithHealthCheck | null> {
  const client = getClient(params.tx);

  const agent = await client.agent.findUnique({
    where: { id: params.id },
    include: {
      healthCheckResults: {
        orderBy: { checkedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!agent) return null;

  const { healthCheckResults, ...rest } = agent;
  return {
    ...rest,
    lastHealthCheck: healthCheckResults[0] ?? null,
  };
}

export type GetAgentParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
