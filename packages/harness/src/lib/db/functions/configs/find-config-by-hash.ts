import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";
import { hashConfig } from "../../../../utils/hash-config";

export async function findConfigByHash(
  params: FindConfigByHashParams
): Promise<Config | null> {
  const client = getClient(params.tx);
  const hash = hashConfig(params.configJson);
  return client.config.findFirst({ where: { configHash: hash } });
}

export type FindConfigByHashParams = {
  configJson: Record<string, unknown>;
  tx?: Prisma.TransactionClient;
};
