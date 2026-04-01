import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ConfigWithFailedCount } from "../../types";
import type { Config } from "@prisma/client";

export async function listConfigs(params: ListConfigsParams = {}): Promise<{
  configs: ConfigWithFailedCount[];
  total: number;
  availableTags: string[];
}> {
  const {
    search,
    tags,
    tagMode = "or",
    orderBy = "runCount",
    favoritesOnly,
    limit = 50,
    offset = 0,
  } = params;
  const client = getClient(params.tx);

  const hasActiveFilters = !!(search || (tags && tags.length > 0));

  const baseOrderClause = {
    runCount: "run_count DESC",
    createdAt: "created_at DESC",
    name: "name ASC",
  }[orderBy];

  const orderClause = hasActiveFilters
    ? baseOrderClause
    : `is_favorite DESC, ${baseOrderClause}`;

  const conditions: Prisma.Sql[] = [];
  if (search) {
    conditions.push(Prisma.sql`(c.name ILIKE ${`%${search}%`}
         OR c.description ILIKE ${`%${search}%`}
         OR c.config_json::text ILIKE ${`%${search}%`})`);
  }
  if (tags && tags.length > 0) {
    if (tagMode === "and") {
      conditions.push(Prisma.sql`c.tags @> ${tags}::text[]`);
    } else {
      conditions.push(Prisma.sql`c.tags && ${tags}::text[]`);
    }
  }
  if (favoritesOnly) {
    conditions.push(Prisma.sql`c.is_favorite = true`);
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  const configs = await client.$queryRaw<RawConfigWithFailedCount[]>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (COALESCE(initial_config_id, id))
        *
      FROM tst_configs
      ORDER BY COALESCE(initial_config_id, id), version DESC
    )
    SELECT
      c.*,
      COALESCE((
        SELECT COUNT(*)::int
        FROM tst_runs r
        WHERE r.config_id = c.id
          AND r.status IN ('failed', 'error')
          AND r.created_at >= c.updated_at
      ), 0) as failed_run_count
    FROM latest_versions c
    ${whereClause}
    ORDER BY ${Prisma.raw(orderClause)}
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const countResult = await client.$queryRaw<[{ count: bigint }]>`
    WITH latest_versions AS (
      SELECT DISTINCT ON (COALESCE(initial_config_id, id))
        *
      FROM tst_configs
      ORDER BY COALESCE(initial_config_id, id), version DESC
    )
    SELECT COUNT(*) as count FROM latest_versions c
    ${whereClause}
  `;

  const tagsResult = await client.$queryRaw<[{ all_tags: string[] }]>`
    SELECT ARRAY(
      SELECT DISTINCT unnest(tags)
      FROM tst_configs
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      ORDER BY 1
    ) as all_tags
  `;
  const availableTags = tagsResult[0]?.all_tags || [];

  return {
    configs: configs.map(normalizeConfigWithFailedCountFromRaw),
    total: Number(countResult[0]?.count ?? 0),
    availableTags,
  };
}

function normalizeConfigFromRaw(raw: RawConfig): Config {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    configJson: raw.config_json,
    configHash: raw.config_hash,
    version: raw.version,
    runCount: raw.run_count,
    tags: raw.tags,
    isFavorite: raw.is_favorite,
    createdBy: raw.created_by,
    initialConfigId: raw.initial_config_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

function normalizeConfigWithFailedCountFromRaw(
  raw: RawConfigWithFailedCount
): ConfigWithFailedCount {
  return {
    ...normalizeConfigFromRaw(raw),
    failedRunCount: raw.failed_run_count,
  };
}

type RawConfig = {
  id: string;
  name: string;
  description: string | null;
  config_json: Prisma.JsonValue;
  config_hash: string;
  version: number;
  run_count: number;
  tags: string[];
  is_favorite: boolean;
  created_by: string | null;
  initial_config_id: string | null;
  created_at: Date;
  updated_at: Date;
};

type RawConfigWithFailedCount = RawConfig & {
  failed_run_count: number;
};

export type ListConfigsParams = {
  search?: string;
  tags?: string[];
  tagMode?: "and" | "or";
  orderBy?: "runCount" | "createdAt" | "name";
  favoritesOnly?: boolean;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
