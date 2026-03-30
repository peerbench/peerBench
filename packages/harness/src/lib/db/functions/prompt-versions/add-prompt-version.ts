import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfusePromptVersion } from "../../types";

export async function addPromptVersion(
  params: AddPromptVersionParams
): Promise<LangfusePromptVersion> {
  const client = getClient(params.tx);
  return client.langfusePromptVersion.create({
    data: {
      promptName: params.promptName,
      version: params.version,
      labels: params.labels || [],
      contentHash: params.contentHash,
    },
  });
}

export type AddPromptVersionParams = {
  promptName: string;
  version: number;
  labels?: string[];
  contentHash?: string;
  tx?: Prisma.TransactionClient;
};
