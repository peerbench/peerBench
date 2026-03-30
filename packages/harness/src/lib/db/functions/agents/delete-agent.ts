import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function deleteAgent(params: DeleteAgentParams): Promise<void> {
  const client = getClient(params.tx);
  await client.agent.delete({ where: { id: params.id } });
}

export type DeleteAgentParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
