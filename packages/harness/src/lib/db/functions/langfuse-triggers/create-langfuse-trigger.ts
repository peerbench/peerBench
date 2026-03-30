import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function createLangfuseTrigger(
  params: CreateLangfuseTriggerParams
): Promise<LangfuseTrigger> {
  const client = getClient(params.tx);
  return client.langfuseTrigger.create({
    data: {
      name: params.name,
      promptName: params.promptName,
      configId: params.configId,
      enabled: params.enabled === false ? 0 : 1,
      debounceSeconds: params.debounceSeconds ?? 30,
    },
  });
}

export type CreateLangfuseTriggerParams = {
  name: string;
  promptName: string;
  configId: string;
  enabled?: boolean;
  debounceSeconds?: number;
  tx?: Prisma.TransactionClient;
};
