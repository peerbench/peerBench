import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { HealthCheckResult } from "../../types";
import {
  tryHealthCheckUrl,
  HEALTH_CHECK_FALLBACK_PATHS,
} from "./try-health-check-url";
import { recordHealthCheckResult } from "./record-health-check-result";

/**
 * Perform a health check for a single agent.
 * Tries the configured healthCheckPath from metadata first, then fallback paths.
 * Saves the discovered working path to agent metadata for future use.
 */
export async function performHealthCheckForAgent(
  params: PerformHealthCheckForAgentParams
): Promise<HealthCheckResult> {
  const client = getClient(params.tx);
  const agent = await client.agent.findUnique({
    where: { id: params.agentId },
  });

  if (!agent) {
    throw new Error(`Agent not found: ${params.agentId}`);
  }

  const baseUrl = agent.endpointUrl.replace(/\/+$/, "");
  const metadata = (agent.metadata || {}) as Record<string, unknown>;
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

  if (successfulPath && successfulPath !== metadata.healthCheckPath) {
    await client.agent.update({
      where: { id: params.agentId },
      data: {
        metadata: {
          ...metadata,
          healthCheckPath: successfulPath,
        } as Prisma.InputJsonValue,
      },
    });
  }

  const status: "healthy" | "unhealthy" = lastResult?.success
    ? "healthy"
    : "unhealthy";
  const errorMessage = lastResult?.success
    ? undefined
    : `All health check paths failed. Last error: ${lastResult?.errorMessage || "Unknown"}`;

  return recordHealthCheckResult({
    agentId: params.agentId,
    runId: params.runId,
    status,
    statusCode: lastResult?.statusCode,
    responseTimeMs: totalResponseTimeMs,
    checkedPath: successfulPath ?? undefined,
    errorMessage,
    tx: params.tx,
  });
}

export type PerformHealthCheckForAgentParams = {
  agentId: string;
  runId?: string;
  tx?: Prisma.TransactionClient;
};
