import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getComparisonTimeSeries(
  params: GetComparisonTimeSeriesParams
): Promise<
  Array<{
    configId: string;
    configName: string;
    agentId: string;
    agentName: string;
    series: Array<{
      date: string;
      avgScore: number;
      count: number;
    }>;
  }>
> {
  const { agentIds, configIds, days = 30 } = params;

  if (agentIds.length === 0 || configIds.length === 0) {
    return [];
  }

  const client = getClient(params.tx);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const rows = await client.$queryRaw<
    Array<{
      date: string;
      config_id: string;
      config_name: string;
      agent_id: string;
      agent_name: string;
      avg_score: number;
      count: bigint;
    }>
  >`
    SELECT
      DATE(res.created_at)::text as date,
      r.config_id,
      c.name as config_name,
      res.agent_id,
      COALESCE(a.name, a.agent_id) as agent_name,
      AVG(res.score_value) as avg_score,
      COUNT(*) as count
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE res.agent_id = ANY(${agentIds}::uuid[])
      AND r.config_id = ANY(${configIds}::uuid[])
      AND res.created_at >= ${startDate}
    GROUP BY DATE(res.created_at), r.config_id, c.name, res.agent_id, a.id
    ORDER BY DATE(res.created_at), r.config_id, res.agent_id
  `;

  const resultMap = new Map<
    string,
    Map<string, Array<{ date: string; avgScore: number; count: number }>>
  >();

  for (const r of rows) {
    if (!r.config_id || !r.agent_id) continue;

    const configKey = `${r.config_id}|${r.config_name ?? "Unknown"}`;
    const agentKey = `${r.agent_id}|${r.agent_name ?? "Unknown"}`;

    if (!resultMap.has(configKey)) {
      resultMap.set(configKey, new Map());
    }

    const configMap = resultMap.get(configKey)!;
    if (!configMap.has(agentKey)) {
      configMap.set(agentKey, []);
    }

    configMap.get(agentKey)!.push({
      date: r.date,
      avgScore: Number(r.avg_score) || 0,
      count: Number(r.count),
    });
  }

  const result: Array<{
    configId: string;
    configName: string;
    agentId: string;
    agentName: string;
    series: Array<{ date: string; avgScore: number; count: number }>;
  }> = [];

  for (const [configKey, agentMap] of resultMap.entries()) {
    const [configId, configName] = configKey.split("|");
    for (const [agentKey, series] of agentMap.entries()) {
      const [agentId, agentName] = agentKey.split("|");
      result.push({
        configId,
        configName,
        agentId,
        agentName,
        series: series.sort((a, b) => a.date.localeCompare(b.date)),
      });
    }
  }

  return result;
}

export type GetComparisonTimeSeriesParams = {
  agentIds: string[];
  configIds: string[];
  days?: number;
  tx?: Prisma.TransactionClient;
};
