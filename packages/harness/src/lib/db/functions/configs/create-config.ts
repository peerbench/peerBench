import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";
import { hashConfig } from "../../../../utils/hash-config";

export async function createConfig(
  params: CreateConfigParams
): Promise<Config> {
  const client = getClient(params.tx);
  return client.config.create({
    data: {
      name: params.name,
      description: params.description,
      configJson: params.configJson as Prisma.InputJsonValue,
      configHash: hashConfig(params.configJson),
      tags: params.tags || [],
      createdBy: params.createdBy,
    },
  });
}

export type CreateConfigParams = {
  name: string;
  description?: string;
  configJson: Record<string, unknown>;
  tags?: string[];
  createdBy?: string;
  tx?: Prisma.TransactionClient;
};
