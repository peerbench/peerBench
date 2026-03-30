import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { Trigger } from "../../types";

export async function getTriggersWithConfigs(
  params: GetTriggersWithConfigsParams = {}
): Promise<{
  triggers: Array<Trigger & { configName: string }>;
  total: number;
}> {
  const { search, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          {
            config: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [triggers, total] = await Promise.all([
    client.trigger.findMany({
      where,
      include: { config: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    client.trigger.count({ where }),
  ]);

  return {
    triggers: triggers.map((t) => ({
      ...t,
      configName: t.config.name,
    })),
    total,
  };
}

export type GetTriggersWithConfigsParams = {
  search?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
