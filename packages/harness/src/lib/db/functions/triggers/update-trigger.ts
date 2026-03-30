import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function updateTrigger(
  params: UpdateTriggerParams
): Promise<Trigger | null> {
  const client = getClient(params.tx);

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.configId !== undefined) updateData.configId = params.configId;
  if (params.intervalSeconds !== undefined) {
    updateData.intervalSeconds = params.intervalSeconds;
    updateData.nextRunAt = new Date(Date.now() + params.intervalSeconds * 1000);
  }
  if (params.enabled !== undefined) updateData.enabled = params.enabled ? 1 : 0;
  if (params.skipIfRecentRunSeconds !== undefined) {
    updateData.skipIfRecentRunSeconds = params.skipIfRecentRunSeconds;
  }

  return client.trigger.update({
    where: { id: params.id },
    data: updateData,
  });
}

export type UpdateTriggerParams = {
  id: string;
  name?: string;
  configId?: string;
  intervalSeconds?: number;
  enabled?: boolean;
  skipIfRecentRunSeconds?: number | null;
  tx?: Prisma.TransactionClient;
};
