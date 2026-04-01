import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Agent } from "../../types";

export async function findAgentForExecution(
  params: FindAgentForExecutionParams
): Promise<Agent | null> {
  const client = getClient(params.tx);

  return client.agent.findFirst({
    where: {
      AND: [
        {
          OR: [
            { endpointUrl: params.endpointUrl },
            { endpointUrl: { startsWith: params.endpointUrl } },
          ],
        },
        params.agentName ? { name: params.agentName } : {},
        params.provider ? { provider: params.provider } : {},
      ],
    },
  });
}

export type FindAgentForExecutionParams = {
  endpointUrl: string;
  provider?: string;
  agentName?: string;
  tx?: Prisma.TransactionClient;
};
