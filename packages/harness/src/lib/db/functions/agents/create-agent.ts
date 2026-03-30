import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Agent } from "../../types";

export async function createAgent(params: CreateAgentParams): Promise<Agent> {
  const client = getClient(params.tx);

  return client.agent.create({
    data: {
      agentId: params.agentId,
      name: params.name,
      provider: params.provider,
      endpointUrl: params.endpointUrl,
      description: params.description,
      metadata: (params.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

export type CreateAgentParams = {
  agentId: string;
  name?: string;
  provider: string;
  endpointUrl: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};
