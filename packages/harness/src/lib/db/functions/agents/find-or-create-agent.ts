import { Prisma } from "@prisma/client";
import { getClient, normalizeEndpointUrl } from "../../helpers";
import type { Agent } from "../../types";
import { createAgent } from "./create-agent";

export async function findOrCreateAgent(
  params: FindOrCreateAgentParams
): Promise<{ agent: Agent; created: boolean }> {
  const client = getClient(params.tx);
  const normalizedUrl =
    normalizeEndpointUrl(params.endpointUrl) || params.endpointUrl;

  const existing = await client.agent.findFirst({
    where: {
      provider: params.provider,
      endpointUrl: normalizedUrl,
      agentId: params.agentId,
    },
  });

  if (existing) {
    const existingMetadata = (existing.metadata || {}) as Record<
      string,
      unknown
    >;
    const mergedMetadata = { ...existingMetadata, ...params.metadata };

    const updated = await client.agent.update({
      where: { id: existing.id },
      data: {
        name: params.name ?? existing.name,
        metadata: mergedMetadata as Prisma.InputJsonValue,
        description: params.description ?? existing.description,
        updatedAt: new Date(),
      },
    });

    return { agent: updated, created: false };
  }

  return {
    agent: await createAgent({
      agentId: params.agentId,
      name: params.name,
      provider: params.provider,
      endpointUrl: normalizedUrl,
      description: params.description,
      metadata: params.metadata,
      tx: params.tx,
    }),
    created: true,
  };
}

export type FindOrCreateAgentParams = {
  agentId: string;
  name?: string;
  provider: string;
  endpointUrl: string;
  description?: string;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};
