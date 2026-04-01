import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getConfigVersions(
  params: GetConfigVersionsParams
): Promise<Config[]> {
  const client = getClient(params.tx);
  const config = await client.config.findUnique({
    where: { id: params.configId },
  });
  if (!config) return [];

  const groupId = config.initialConfigId ?? config.id;
  const rows = await client.$queryRaw<RawConfig[]>`
    SELECT * FROM tst_configs
    WHERE COALESCE(initial_config_id, id) = ${groupId}::uuid
    ORDER BY version ASC
  `;

  return rows.map(normalizeConfigFromRaw);
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

export type GetConfigVersionsParams = {
  configId: string;
  tx?: Prisma.TransactionClient;
};
