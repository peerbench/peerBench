import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function getLangfuseTriggersWithConfigs(
  params: GetLangfuseTriggersWithConfigsParams = {}
): Promise<{
  triggers: Array<LangfuseTrigger & { configName: string }>;
  total: number;
}> {
  const { search, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { promptName: { contains: search, mode: "insensitive" as const } },
          {
            config: {
              name: { contains: search, mode: "insensitive" as const },
            },
          },
        ],
      }
    : {};

  const [triggers, total] = await Promise.all([
    client.langfuseTrigger.findMany({
      where,
      include: { config: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    client.langfuseTrigger.count({ where }),
  ]);

  return {
    triggers: triggers.map((t) => ({
      ...t,
      configName: t.config.name,
    })),
    total,
  };
}

export type GetLangfuseTriggersWithConfigsParams = {
  search?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
