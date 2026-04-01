import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getConfig(
  params: GetConfigParams
): Promise<Config | null> {
  const client = getClient(params.tx);
  return client.config.findUnique({ where: { id: params.id } });
}

export type GetConfigParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
