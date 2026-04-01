import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function updateLangfuseTriggerAfterRun(
  params: UpdateLangfuseTriggerAfterRunParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.langfuseTrigger.update({
    where: { id: params.id },
    data: {
      lastTriggeredAt: params.lastTriggeredAt,
      lastTriggeredVersion: params.lastTriggeredVersion,
      lastRunId: params.lastRunId,
      lastRunStatus: params.lastRunStatus,
      triggerCount: { increment: 1 },
    },
  });
}

export type UpdateLangfuseTriggerAfterRunParams = {
  id: string;
  lastTriggeredAt: Date;
  lastTriggeredVersion: number;
  lastRunId: string;
  lastRunStatus: string;
  tx?: Prisma.TransactionClient;
};
