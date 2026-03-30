import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function listTriggers(
  params: ListTriggersParams = {}
): Promise<{ triggers: Trigger[]; total: number }> {
  const { configId, enabled, search, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const where = {
    AND: [
      configId ? { configId } : {},
      enabled !== undefined ? { enabled: enabled ? 1 : 0 } : {},
      search
        ? { name: { contains: search, mode: "insensitive" as const } }
        : {},
    ],
  };

  const [triggers, total] = await Promise.all([
    client.trigger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    client.trigger.count({ where }),
  ]);

  return { triggers, total };
}

export type ListTriggersParams = {
  configId?: string;
  enabled?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
