import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfusePromptVersion } from "../../types";

export async function listPromptVersions(
  params: ListPromptVersionsParams
): Promise<LangfusePromptVersion[]> {
  const client = getClient(params.tx);
  return client.langfusePromptVersion.findMany({
    where: { promptName: params.promptName },
    orderBy: { version: "desc" },
  });
}

export type ListPromptVersionsParams = {
  promptName: string;
  tx?: Prisma.TransactionClient;
};
