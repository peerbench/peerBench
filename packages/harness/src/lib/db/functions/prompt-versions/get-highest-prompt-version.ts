import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getHighestPromptVersion(
  params: GetHighestPromptVersionParams
): Promise<number> {
  const client = getClient(params.tx);
  const result = await client.langfusePromptVersion.aggregate({
    where: { promptName: params.promptName },
    _max: { version: true },
  });
  return result._max.version || 0;
}

export type GetHighestPromptVersionParams = {
  promptName: string;
  tx?: Prisma.TransactionClient;
};
