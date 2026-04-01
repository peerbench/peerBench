import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function deleteLangfuseTrigger(
  params: DeleteLangfuseTriggerParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.langfuseTrigger.delete({ where: { id: params.id } });
}

export type DeleteLangfuseTriggerParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
