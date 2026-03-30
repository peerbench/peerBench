import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";
import { prisma } from "../../prisma";
import { hashConfig } from "../../../../utils/hash-config";

export async function updateConfig(
  params: UpdateConfigParams
): Promise<Config | null> {
  const client = getClient(params.tx);
  const current = await client.config.findUnique({
    where: { id: params.id },
  });
  if (!current) return null;

  // When configJson changes, create a NEW Config row (new version)
  if (params.configJson !== undefined) {
    const groupId = current.initialConfigId ?? current.id;

    const executeVersionUpdate = async (
      tx: Prisma.TransactionClient
    ): Promise<Config> => {
      const newConfig = await tx.config.create({
        data: {
          name: params.name ?? current.name,
          description:
            params.description !== undefined
              ? params.description
              : current.description,
          configJson: params.configJson as Prisma.InputJsonValue,
          configHash: hashConfig(params.configJson!),
          version: current.version + 1,
          tags: params.tags ?? current.tags,
          isFavorite: current.isFavorite,
          createdBy: current.createdBy,
          initialConfigId: groupId,
        },
      });

      await tx.trigger.updateMany({
        where: { configId: params.id },
        data: { configId: newConfig.id },
      });

      await tx.langfuseTrigger.updateMany({
        where: { configId: params.id },
        data: { configId: newConfig.id },
      });

      return newConfig;
    };

    // STD-03: Skip internal $transaction when external tx is provided
    if (params.tx) {
      return executeVersionUpdate(params.tx);
    }
    return prisma.$transaction(executeVersionUpdate);
  }

  // Metadata-only change: propagate to ALL versions in the group
  const groupId = current.initialConfigId ?? current.id;
  const updateData: Prisma.ConfigUpdateInput = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.description !== undefined)
    updateData.description = params.description;
  if (params.tags !== undefined) updateData.tags = params.tags;

  if (Object.keys(updateData).length > 0) {
    const groupIds = await client.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM tst_configs
      WHERE COALESCE(initial_config_id, id) = ${groupId}::uuid
    `;
    const ids = groupIds.map((r) => r.id);
    if (ids.length > 0) {
      await client.config.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
    }
  }

  return client.config.findUnique({ where: { id: params.id } });
}

export type UpdateConfigParams = {
  id: string;
  name?: string;
  description?: string;
  configJson?: Record<string, unknown>;
  tags?: string[];
  tx?: Prisma.TransactionClient;
};
