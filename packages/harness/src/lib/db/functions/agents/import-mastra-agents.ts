import { Prisma } from "@prisma/client";
import { getClient, normalizeEndpointUrl } from "../../helpers";
import type { Agent } from "../../types";
import { createAgent } from "./create-agent";

export async function importMastraAgents(
  params: ImportMastraAgentsParams
): Promise<{ imported: number; agents: Agent[] }> {
  const client = getClient(params.tx);
  const normalizedBaseUrl =
    normalizeEndpointUrl(params.baseUrl) || params.baseUrl;
  const url = new URL(normalizedBaseUrl);
  const origin = url.origin;

  const knownRoutes = ["/api/agents", "/agents"];
  let response: Response | null = null;

  for (const route of knownRoutes) {
    const fetchUrl = `${origin}${route}`;
    try {
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          response = res;
          break;
        }
      }
    } catch {
      // Try next route
    }
  }

  if (!response) {
    throw new Error(
      `Could not find agents endpoint. Tried: ${knownRoutes.map((r) => origin + r).join(", ")}`
    );
  }

  const responseData = await response.json();
  const agentsData: Array<{
    name: string;
    description?: string;
    instructions?: string;
    [key: string]: unknown;
  }> = Array.isArray(responseData) ? responseData : Object.values(responseData);

  const imported: Agent[] = [];

  for (const agentData of agentsData) {
    const existing = await client.agent.findFirst({
      where: {
        endpointUrl: { startsWith: origin },
        provider: "mastra",
        agentId: agentData.name,
      },
    });

    if (!existing) {
      const agent = await createAgent({
        agentId: agentData.name,
        name: agentData.name,
        provider: "mastra",
        endpointUrl: origin,
        description:
          agentData.description || agentData.instructions?.slice(0, 200),
        metadata: agentData,
        tx: params.tx,
      });
      imported.push(agent);
    }
  }

  return { imported: imported.length, agents: imported };
}

export type ImportMastraAgentsParams = {
  baseUrl: string;
  tx?: Prisma.TransactionClient;
};
