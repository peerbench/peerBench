import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfusePromptVersion } from "../../types";

export async function getPromptVersion(
  params: GetPromptVersionParams
): Promise<LangfusePromptVersion | null> {
  const client = getClient(params.tx);
  return client.langfusePromptVersion.findFirst({
    where: { promptName: params.promptName, version: params.version },
  });
}

export type GetPromptVersionParams = {
  promptName: string;
  version: number;
  tx?: Prisma.TransactionClient;
};
