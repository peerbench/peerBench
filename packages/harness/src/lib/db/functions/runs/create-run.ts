import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Run } from "../../types";

export async function createRun(params: CreateRunParams): Promise<Run> {
  const client = getClient(params.tx);
  return client.run.create({
    data: {
      configId: params.configId,
      configVersion: params.configVersion,
      configSnapshot: params.configSnapshot as Prisma.InputJsonValue,
      totalTestCases: params.totalTestCases || 0,
      metadata: (params.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

export type CreateRunParams = {
  configId?: string;
  configVersion?: number;
  configSnapshot: Record<string, unknown>;
  totalTestCases?: number;
  metadata?: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};
