import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function incrementRunCount(
  params: IncrementRunCountParams
): Promise<void> {
  const client = getClient(params.tx);
  await client.config.update({
    where: { id: params.id },
    data: { runCount: { increment: 1 } },
  });
}

export type IncrementRunCountParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
