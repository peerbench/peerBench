import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function deleteTrigger(
  params: DeleteTriggerParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.trigger.delete({ where: { id: params.id } });
}

export type DeleteTriggerParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
