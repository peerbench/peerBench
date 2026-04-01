import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { HealthCheckResult } from "../../types";

export async function recordHealthCheckResult(
  params: RecordHealthCheckResultParams
): Promise<HealthCheckResult> {
  const client = getClient(params.tx);
  return client.healthCheckResult.create({
    data: {
      agentId: params.agentId,
      runId: params.runId,
      status: params.status,
      statusCode: params.statusCode,
      responseTimeMs: params.responseTimeMs,
      checkedPath: params.checkedPath,
      errorMessage: params.errorMessage,
    },
  });
}

export type RecordHealthCheckResultParams = {
  agentId: string;
  runId?: string;
  status: "healthy" | "unhealthy";
  statusCode?: number;
  responseTimeMs?: number;
  checkedPath?: string;
  errorMessage?: string;
  tx?: Prisma.TransactionClient;
};
