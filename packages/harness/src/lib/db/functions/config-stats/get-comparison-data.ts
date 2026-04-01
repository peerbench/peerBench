import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getComparisonData(
  params: GetComparisonDataParams
): Promise<
  Array<{
    agentId: string;
    agentName: string;
    configId: string;
    configName: string;
    avgScore: number | null;
    resultCount: number;
    scoredCount: number;
  }>
> {
  const { agentIds, configIds } = params;

  if (agentIds.length === 0 || configIds.length === 0) {
    return [];
  }

  const client = getClient(params.tx);

  const rows = await client.$queryRaw<
    Array<{
      agent_id: string;
      agent_name: string;
      config_id: string;
      config_name: string;
      result_count: bigint;
      scored_count: bigint;
      avg_score: number | null;
    }>
  >`
    SELECT
      res.agent_id,
      COALESCE(a.name, a.agent_id) as agent_name,
      r.config_id,
      c.name as config_name,
      COUNT(*) as result_count,
      COUNT(res.score_value) as scored_count,
      AVG(res.score_value) as avg_score
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE res.agent_id = ANY(${agentIds}::uuid[])
      AND r.config_id = ANY(${configIds}::uuid[])
    GROUP BY res.agent_id, a.id, r.config_id, c.name
  `;

  return rows
    .filter((r) => r.agent_id && r.config_id)
    .map((r) => ({
      agentId: r.agent_id,
      agentName: r.agent_name ?? "Unknown",
      configId: r.config_id,
      configName: r.config_name ?? "Unknown",
      avgScore: r.avg_score ? Number(r.avg_score) : null,
      resultCount: Number(r.result_count),
      scoredCount: Number(r.scored_count),
    }));
}

export type GetComparisonDataParams = {
  agentIds: string[];
  configIds: string[];
  tx?: Prisma.TransactionClient;
};
