import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LeaderboardFilters } from "../../types";

export async function getLeaderboardFilters(
  params: GetLeaderboardFiltersParams = {}
): Promise<LeaderboardFilters> {
  const client = getClient(params.tx);

  const [
    runnersResult,
    scorersResult,
    tagsResult,
    providersResult,
    agentsResult,
    configsResult,
  ] = await Promise.all([
    client.$queryRaw<Array<{ runner: string }>>`
      SELECT DISTINCT config_snapshot->>'runner' as runner
      FROM tst_runs
      WHERE config_snapshot->>'runner' IS NOT NULL
      ORDER BY runner
    `,
    client.$queryRaw<Array<{ scorer: string }>>`
      SELECT DISTINCT config_snapshot->>'scorer' as scorer
      FROM tst_runs
      WHERE config_snapshot->>'scorer' IS NOT NULL
      ORDER BY scorer
    `,
    client.$queryRaw<[{ all_tags: string[] }]>`
      SELECT ARRAY(
        SELECT DISTINCT unnest(tags)
        FROM tst_configs
        WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
        ORDER BY 1
      ) as all_tags
    `,
    client.$queryRaw<Array<{ provider: string }>>`
      SELECT DISTINCT provider
      FROM tst_agents
      WHERE provider IS NOT NULL
      ORDER BY provider
    `,
    client.$queryRaw<Array<{ id: string; name: string; provider: string }>>`
      SELECT id, name, provider
      FROM tst_agents
      ORDER BY name
    `,
    client.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name
      FROM tst_configs
      ORDER BY name
    `,
  ]);

  return {
    runners: runnersResult.map((r) => r.runner),
    scorers: scorersResult.map((r) => r.scorer),
    tags: tagsResult[0]?.all_tags || [],
    providers: providersResult.map((r) => r.provider),
    agents: agentsResult,
    configs: configsResult,
  };
}

export type GetLeaderboardFiltersParams = {
  tx?: Prisma.TransactionClient;
};
