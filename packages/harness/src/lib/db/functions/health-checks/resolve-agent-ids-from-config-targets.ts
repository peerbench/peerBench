import { Prisma } from "@prisma/client";
import {
  readString,
  resolveEnvVariables,
} from "@peerbench/core";
import { getRegistries } from "../../../../lib/registry-context";
import { getClient, normalizeEndpointUrl } from "../../helpers";

export async function resolveAgentIdsFromConfigTargets(
  params: ResolveAgentIdsFromConfigTargetsParams
): Promise<string[]> {
  const client = getClient(params.tx);
  const ids: string[] = [];

  for (const target of params.targets) {
    const provider = readString(target.provider);
    if (!provider) continue;

    const providerEntry = getRegistries().providers.find(provider, false);
    if (!providerEntry) continue;

    try {
      const resolvedTarget = resolveEnvVariables(
        target as Record<string, unknown>,
        []
      ) as Record<string, unknown>;

      const endpointUrl = normalizeEndpointUrl(
        providerEntry.getEndpoint(resolvedTarget)
      );
      if (!endpointUrl) continue;

      const callableLLM = providerEntry.instantiateFromConfig(resolvedTarget);

      const agent = await client.agent.findFirst({
        where: {
          provider,
          endpointUrl,
          agentId: callableLLM.slug,
        },
        select: { id: true },
      });

      if (agent) {
        ids.push(agent.id);
      }
    } catch {
      // Skip targets that fail to resolve
    }
  }

  return ids;
}

export type ResolveAgentIdsFromConfigTargetsParams = {
  targets: Record<string, unknown>[];
  tx?: Prisma.TransactionClient;
};
