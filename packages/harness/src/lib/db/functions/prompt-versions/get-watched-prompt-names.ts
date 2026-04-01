import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getWatchedPromptNames(
  params: GetWatchedPromptNamesParams = {}
): Promise<string[]> {
  const client = getClient(params.tx);
  const results = await client.langfuseTrigger.findMany({
    where: { enabled: 1 },
    select: { promptName: true },
    distinct: ["promptName"],
  });
  return results.map((r) => r.promptName);
}

export type GetWatchedPromptNamesParams = {
  tx?: Prisma.TransactionClient;
};
