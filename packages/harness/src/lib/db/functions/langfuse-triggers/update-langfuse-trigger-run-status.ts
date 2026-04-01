import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function updateLangfuseTriggerRunStatus(
  params: UpdateLangfuseTriggerRunStatusParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.langfuseTrigger.update({
    where: { id: params.id },
    data: { lastRunStatus: params.lastRunStatus },
  });
}

export type UpdateLangfuseTriggerRunStatusParams = {
  id: string;
  lastRunStatus: string;
  tx?: Prisma.TransactionClient;
};
