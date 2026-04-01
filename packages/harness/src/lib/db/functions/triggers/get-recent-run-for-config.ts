import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Run } from "../../types";

export async function getRecentRunForConfig(
  params: GetRecentRunForConfigParams
): Promise<Run | null> {
  const client = getClient(params.tx);
  const cutoff = new Date(Date.now() - params.withinSeconds * 1000);

  return client.run.findFirst({
    where: {
      configId: params.configId,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });
}

export type GetRecentRunForConfigParams = {
  configId: string;
  withinSeconds: number;
  tx?: Prisma.TransactionClient;
};
