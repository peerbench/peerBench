import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function updateLangfuseTrigger(
  params: UpdateLangfuseTriggerParams
): Promise<LangfuseTrigger | null> {
  const client = getClient(params.tx);

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.promptName !== undefined)
    updateData.promptName = params.promptName;
  if (params.configId !== undefined) updateData.configId = params.configId;
  if (params.enabled !== undefined) updateData.enabled = params.enabled ? 1 : 0;
  if (params.debounceSeconds !== undefined)
    updateData.debounceSeconds = params.debounceSeconds;

  return client.langfuseTrigger.update({
    where: { id: params.id },
    data: updateData,
  });
}

export type UpdateLangfuseTriggerParams = {
  id: string;
  name?: string;
  promptName?: string;
  configId?: string;
  enabled?: boolean;
  debounceSeconds?: number;
  tx?: Prisma.TransactionClient;
};
