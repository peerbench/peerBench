import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getRunFilterOptions(
  params: GetRunFilterOptionsParams = {}
): Promise<{
  runners: string[];
  scorers: string[];
  sources: string[];
  statuses: string[];
  configTags: string[];
  agents: Array<{ id: string; name: string }>;
  providers: string[];
}> {
  const client = getClient(params.tx);

  const runs = await client.run.findMany({
    select: {
      configSnapshot: true,
      metadata: true,
      status: true,
    },
  });

  const runners = new Set<string>();
  const scorers = new Set<string>();
  const sources = new Set<string>();
  const statuses = new Set<string>();

  for (const run of runs) {
    const snapshot = run.configSnapshot as Record<string, unknown>;
    const meta = run.metadata as Record<string, unknown>;
    if (snapshot?.runner) runners.add(String(snapshot.runner));
    if (snapshot?.scorer) scorers.add(String(snapshot.scorer));
    if (meta?.triggeredBy) sources.add(String(meta.triggeredBy));
    if (run.status) statuses.add(run.status);
  }

  const tagsResult = await client.$queryRaw<[{ all_tags: string[] }]>`
    SELECT ARRAY(
      SELECT DISTINCT jsonb_array_elements_text(c.config_json->'tags')
      FROM tst_configs c
      WHERE EXISTS (SELECT 1 FROM tst_runs r WHERE r.config_id = c.id)
        AND c.config_json->'tags' IS NOT NULL
      ORDER BY 1
    ) as all_tags
  `;
  const configTags = tagsResult[0]?.all_tags || [];

  const agentsResult = await client.$queryRaw<
    Array<{ id: string; name: string }>
  >`
    SELECT DISTINCT a.id, COALESCE(a.name, a.agent_id) as name
    FROM tst_agents a
    WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.agent_id = a.id)
    ORDER BY COALESCE(a.name, a.agent_id)
  `;

  const providersResult = await client.$queryRaw<Array<{ provider: string }>>`
    SELECT DISTINCT a.provider
    FROM tst_agents a
    WHERE EXISTS (SELECT 1 FROM tst_results res WHERE res.agent_id = a.id)
    ORDER BY a.provider
  `;
  const providers = providersResult.map((r) => r.provider);

  return {
    runners: Array.from(runners).sort(),
    scorers: Array.from(scorers).sort(),
    sources: Array.from(sources).sort(),
    statuses: Array.from(statuses).sort(),
    configTags,
    agents: agentsResult,
    providers,
  };
}

export type GetRunFilterOptionsParams = {
  tx?: Prisma.TransactionClient;
};
