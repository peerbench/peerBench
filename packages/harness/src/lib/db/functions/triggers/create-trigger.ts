import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function createTrigger(
  params: CreateTriggerParams
): Promise<Trigger> {
  const client = getClient(params.tx);
  const nextRunAt = new Date(Date.now() + params.intervalSeconds * 1000);

  return client.trigger.create({
    data: {
      name: params.name,
      configId: params.configId,
      intervalSeconds: params.intervalSeconds,
      enabled: params.enabled !== false ? 1 : 0,
      skipIfRecentRunSeconds: params.skipIfRecentRunSeconds ?? null,
      nextRunAt,
    },
  });
}

export type CreateTriggerParams = {
  name: string;
  configId: string;
  intervalSeconds: number;
  enabled?: boolean;
  skipIfRecentRunSeconds?: number | null;
  tx?: Prisma.TransactionClient;
};
