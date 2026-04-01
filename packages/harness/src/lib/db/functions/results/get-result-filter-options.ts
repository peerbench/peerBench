import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getResultFilterOptions(
  params: GetResultFilterOptionsParams = {}
): Promise<{
  statuses: string[];
  runners: string[];
  scorers: string[];
  agents: Array<{ id: string; name: string }>;
  configs: Array<{ id: string; name: string }>;
}> {
  const client = getClient(params.tx);

  const [statusRows, runnerRows, scorerRows, agentRows, configRows] =
    await Promise.all([
      client.$queryRaw<Array<{ status: string }>>`
        SELECT DISTINCT status FROM tst_results ORDER BY status
      `,
      client.$queryRaw<Array<{ runner: string }>>`
        SELECT DISTINCT r.config_snapshot->>'runner' as runner
        FROM tst_runs r
        WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.run_id = r.id)
          AND r.config_snapshot->>'runner' IS NOT NULL
        ORDER BY runner
      `,
      client.$queryRaw<Array<{ scorer: string }>>`
        SELECT DISTINCT r.config_snapshot->'scorer'->>'type' as scorer
        FROM tst_runs r
        WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.run_id = r.id)
          AND r.config_snapshot->'scorer'->>'type' IS NOT NULL
        ORDER BY scorer
      `,
      client.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT DISTINCT a.id, COALESCE(a.name, a.agent_id) as name
        FROM tst_agents a
        WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.agent_id = a.id)
        ORDER BY COALESCE(a.name, a.agent_id)
      `,
      client.$queryRaw<Array<{ id: string; name: string }>>`
        SELECT DISTINCT c.id, c.name
        FROM tst_configs c
        INNER JOIN tst_runs r ON r.config_id = c.id
        WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.run_id = r.id)
        ORDER BY c.name
      `,
    ]);

  return {
    statuses: statusRows.map((r) => r.status),
    runners: runnerRows.map((r) => r.runner),
    scorers: scorerRows.map((r) => r.scorer),
    agents: agentRows,
    configs: configRows,
  };
}

export type GetResultFilterOptionsParams = {
  tx?: Prisma.TransactionClient;
};
