import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function markInProgressRunsAsPartial(
  params: MarkInProgressRunsAsPartialParams = {}
): Promise<number> {
  const client = getClient(params.tx);
  const result = await client.run.updateMany({
    where: { status: "running" },
    data: { status: "partial" },
  });
  return result.count;
}

export type MarkInProgressRunsAsPartialParams = {
  tx?: Prisma.TransactionClient;
};
