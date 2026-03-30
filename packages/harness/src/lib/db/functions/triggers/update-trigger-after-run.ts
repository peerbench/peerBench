import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function updateTriggerAfterRun(
  params: UpdateTriggerAfterRunParams
): Promise<void> {
  const client = getClient(params.tx);

  await client.trigger.update({
    where: { id: params.id },
    data: {
      lastRunId: params.runId,
      lastRunAt: new Date(),
      lastRunStatus: params.status,
      runCount: { increment: 1 },
    },
  });
}

export type UpdateTriggerAfterRunParams = {
  id: string;
  runId: string;
  status: "completed" | "failed";
  tx?: Prisma.TransactionClient;
};
