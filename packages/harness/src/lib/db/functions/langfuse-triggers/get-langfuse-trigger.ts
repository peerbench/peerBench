import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function getLangfuseTrigger(
  params: GetLangfuseTriggerParams
): Promise<LangfuseTrigger | null> {
  const client = getClient(params.tx);
  return client.langfuseTrigger.findUnique({ where: { id: params.id } });
}

export type GetLangfuseTriggerParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
