import { Prisma, type Config } from "@prisma/client";
import { getConfig } from "./get-config";
import { createConfig } from "./create-config";

export async function duplicateConfig(
  params: DuplicateConfigParams
): Promise<Config | null> {
  const original = await getConfig({ id: params.id, tx: params.tx });
  if (!original) return null;

  return createConfig({
    name: params.newName,
    description: original.description || undefined,
    configJson: original.configJson as Record<string, unknown>,
    tags: original.tags || [],
    tx: params.tx,
  });
}

export type DuplicateConfigParams = {
  id: string;
  newName: string;
  tx?: Prisma.TransactionClient;
};
