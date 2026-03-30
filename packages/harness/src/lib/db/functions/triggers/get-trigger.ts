import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function getTrigger(
  params: GetTriggerParams
): Promise<Trigger | null> {
  const client = getClient(params.tx);
  return client.trigger.findUnique({ where: { id: params.id } });
}

export type GetTriggerParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
