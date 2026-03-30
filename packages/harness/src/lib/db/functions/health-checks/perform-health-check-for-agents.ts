import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { HealthCheckResult } from "../../types";
import {
  tryHealthCheckUrl,
  HEALTH_CHECK_FALLBACK_PATHS,
} from "./try-health-check-url";
import { recordHealthCheckResult } from "./record-health-check-result";

/**
 * Perform health checks for multiple agents.
 * Groups agents by endpoint URL origin to avoid hitting the same URL twice.
 * Creates a HealthCheckResult for every agent sharing a URL.
 */
export async function performHealthCheckForAgents(
  params: PerformHealthCheckForAgentsParams
): Promise<HealthCheckResult[]> {
  if (params.agentIds.length === 0) return [];

  const client = getClient(params.tx);
  const agents = await client.agent.findMany({
    where: { id: { in: params.agentIds } },
  });

  if (agents.length === 0) return [];

  // Group agents by endpoint origin for deduplication
  const groupsByOrigin = new Map<string, typeof agents>();

  for (const agent of agents) {
    let origin: string;
    try {
      origin = new URL(agent.endpointUrl).origin;
    } catch {
      origin = agent.endpointUrl;
    }

    const group = groupsByOrigin.get(origin) || [];
    group.push(agent);
    groupsByOrigin.set(origin, group);
  }

  const allResults: HealthCheckResult[] = [];

  for (const [, group] of groupsByOrigin) {
    const representative = group[0]!;
    const baseUrl = representative.endpointUrl.replace(/\/+$/, "");
    const metadata = (representative.metadata || {}) as Record<string, unknown>;
    const startTime = Date.now();

    const pathsToTry: string[] = [];

    if (typeof metadata.healthCheckPath === "string") {
      pathsToTry.push(metadata.healthCheckPath);
    }

    for (const fallbackPath of HEALTH_CHECK_FALLBACK_PATHS) {
      if (!pathsToTry.includes(fallbackPath)) {
        pathsToTry.push(fallbackPath);
      }
    }

    let lastResult: {
      success: boolean;
      statusCode?: number;
      errorMessage?: string;
      responseTimeMs: number;
    } | null = null;
    let successfulPath: string | null = null;

    for (const path of pathsToTry) {
      const url = `${baseUrl}${path}`;
      const result = await tryHealthCheckUrl({ url, timeoutMs: 5000 });

      if (result.success) {
        lastResult = result;
        successfulPath = path;
        break;
      }

      lastResult = result;
    }

    const totalResponseTimeMs = Date.now() - startTime;
    const status: "healthy" | "unhealthy" = lastResult?.success
      ? "healthy"
      : "unhealthy";
    const errorMessage = lastResult?.success
      ? undefined
      : `All health check paths failed. Last error: ${lastResult?.errorMessage || "Unknown"}`;

    // Record result for every agent in this group
    for (const agent of group) {
      const result = await recordHealthCheckResult({
        agentId: agent.id,
        runId: params.runId,
        status,
        statusCode: lastResult?.statusCode,
        responseTimeMs: totalResponseTimeMs,
        checkedPath: successfulPath ?? undefined,
        errorMessage,
        tx: params.tx,
      });
      allResults.push(result);
    }

    // Update healthCheckPath on all agents in the group if a new path was discovered
    if (successfulPath) {
      for (const agent of group) {
        const agentMeta = (agent.metadata || {}) as Record<string, unknown>;
        if (agentMeta.healthCheckPath !== successfulPath) {
          await client.agent.update({
            where: { id: agent.id },
            data: {
              metadata: {
                ...agentMeta,
                healthCheckPath: successfulPath,
              } as Prisma.InputJsonValue,
            },
          });
        }
      }
    }
  }

  return allResults;
}

export type PerformHealthCheckForAgentsParams = {
  agentIds: string[];
  runId?: string;
  tx?: Prisma.TransactionClient;
};
