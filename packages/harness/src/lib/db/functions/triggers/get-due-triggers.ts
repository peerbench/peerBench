import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function getDueTriggers(
  params: GetDueTriggersParams = {}
): Promise<Trigger[]> {
  const client = getClient(params.tx);

  return client.trigger.findMany({
    where: {
      enabled: 1,
      nextRunAt: { lte: new Date() },
    },
  });
}

export type GetDueTriggersParams = {
  tx?: Prisma.TransactionClient;
};
