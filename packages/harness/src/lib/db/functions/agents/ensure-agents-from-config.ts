import { Prisma } from "@prisma/client";
import {
  resolveConfigEndpoints,
  resolveAgentNamesForMastra,
  resolveModelSlugs,
  normalizeEndpointUrl,
} from "../../helpers";
import {
  readString,
  providerRegistry,
  resolveEnvVariables,
} from "@peerbench/core";
import { findOrCreateAgent } from "./find-or-create-agent";
import { performHealthCheckForAgents } from "../health-checks/perform-health-check-for-agents";
import { resolveAgentIdsFromConfigTargets } from "../health-checks/resolve-agent-ids-from-config-targets";

export async function ensureAgentsFromConfig(
  params: EnsureAgentsFromConfigParams
): Promise<{ created: number; skipped: number }> {
  const targets = Array.isArray(params.configJson.targets)
    ? params.configJson.targets.filter(
        (v): v is Record<string, unknown> => typeof v === "object" && v !== null
      )
    : [];

  if (targets.length === 0) {
    const provider = readString(params.configJson.provider);
    const endpoints = resolveConfigEndpoints(params.configJson);
    const agentNames =
      provider === "mastra"
        ? resolveAgentNamesForMastra(params.configJson)
        : resolveModelSlugs(params.configJson);

    if (!provider || endpoints.length === 0 || agentNames.length === 0) {
      return { created: 0, skipped: 0 };
    }

    let created = 0;
    let skipped = 0;

    for (const endpointUrl of endpoints) {
      for (const slug of agentNames) {
        const { created: didCreate } = await findOrCreateAgent({
          agentId: slug,
          provider,
          endpointUrl,
          description: params.importedFrom
            ? `Imported from config: ${params.importedFrom}`
            : undefined,
          metadata: {
            provider,
            importedFrom: params.importedFrom,
          },
          tx: params.tx,
        });
        if (didCreate) created++;
        else skipped++;
      }
    }

    return { created, skipped };
  }

  let created = 0;
  let skipped = 0;

  for (const target of targets) {
    const provider = readString(target.provider);
    if (!provider) continue;

    const providerEntry = providerRegistry.find(provider, false);
    if (!providerEntry) continue;

    const resolvedTarget = resolveEnvVariables(
      target as Record<string, unknown>,
      []
    ) as { name?: string; params?: Record<string, unknown> };

    const endpointUrl = normalizeEndpointUrl(
      providerEntry.getEndpoint(resolvedTarget)
    );
    if (!endpointUrl) continue;

    const callableLLM = providerEntry.instantiateFromConfig(resolvedTarget);
    const targetName = readString(target.name);

    const { created: didCreate } = await findOrCreateAgent({
      agentId: callableLLM.slug,
      name: targetName || undefined,
      provider,
      endpointUrl,
      description: params.importedFrom
        ? `Imported from config: ${params.importedFrom}`
        : undefined,
      metadata: {
        provider,
        importedFrom: params.importedFrom,
        targetName,
        model: callableLLM.slug,
      },
      tx: params.tx,
    });

    if (didCreate) created++;
    else skipped++;
  }

  // Fire-and-forget health checks for all resolved agents
  const allAgentIds = await resolveAgentIdsFromConfigTargets({
    targets,
    tx: params.tx,
  });
  if (allAgentIds.length > 0) {
    performHealthCheckForAgents({ agentIds: allAgentIds, tx: params.tx }).catch(
      (err) =>
        console.warn("[ensureAgentsFromConfig] Health check failed:", err)
    );
  }

  return { created, skipped };
}

export type EnsureAgentsFromConfigParams = {
  configJson: Record<string, unknown>;
  importedFrom?: string;
  tx?: Prisma.TransactionClient;
};
