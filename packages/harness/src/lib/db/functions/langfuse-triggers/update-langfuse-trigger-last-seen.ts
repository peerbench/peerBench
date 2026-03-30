import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function updateLangfuseTriggerLastSeen(
  params: UpdateLangfuseTriggerLastSeenParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.langfuseTrigger.update({
    where: { id: params.id },
    data: { lastSeenVersion: params.version },
  });
}

export type UpdateLangfuseTriggerLastSeenParams = {
  id: string;
  version: number;
  tx?: Prisma.TransactionClient;
};
