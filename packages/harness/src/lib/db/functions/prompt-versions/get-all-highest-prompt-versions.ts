import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getAllHighestPromptVersions(
  params: GetAllHighestPromptVersionsParams = {}
): Promise<Map<string, number>> {
  const client = getClient(params.tx);

  const results = await client.$queryRaw<
    Array<{ prompt_name: string; max_version: number }>
  >`
    SELECT prompt_name, MAX(version) as max_version
    FROM tst_langfuse_prompt_versions
    GROUP BY prompt_name
  `;

  const map = new Map<string, number>();
  for (const row of results) {
    if (row.prompt_name && row.max_version) {
      map.set(row.prompt_name, row.max_version);
    }
  }
  return map;
}

export type GetAllHighestPromptVersionsParams = {
  tx?: Prisma.TransactionClient;
};
