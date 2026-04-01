import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Run } from "../../types";

export async function getRun(params: GetRunParams): Promise<Run | null> {
  const client = getClient(params.tx);
  return client.run.findUnique({ where: { id: params.id } });
}

export type GetRunParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
