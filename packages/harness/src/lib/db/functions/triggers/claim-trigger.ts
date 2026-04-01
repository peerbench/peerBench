import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger, Config } from "../../types";

export async function claimTrigger(
  params: ClaimTriggerParams
): Promise<{ trigger: Trigger; config: Config } | null> {
  const client = getClient(params.tx);

  const trigger = await client.trigger.findUnique({
    where: { id: params.id },
    include: { config: true },
  });

  if (!trigger || !trigger.config) return null;

  const nextRunAt = new Date(Date.now() + trigger.intervalSeconds * 1000);
  await client.trigger.update({
    where: { id: params.id },
    data: {
      nextRunAt,
      lastRunStatus: "running",
    },
  });

  return { trigger, config: trigger.config };
}

export type ClaimTriggerParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
