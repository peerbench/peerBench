import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function getEnabledLangfuseTriggersByPrompt(
  params: GetEnabledLangfuseTriggersByPromptParams
): Promise<LangfuseTrigger[]> {
  const client = getClient(params.tx);
  return client.langfuseTrigger.findMany({
    where: {
      promptName: params.promptName,
      enabled: 1,
    },
  });
}

export type GetEnabledLangfuseTriggersByPromptParams = {
  promptName: string;
  tx?: Prisma.TransactionClient;
};
