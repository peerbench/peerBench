import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { LangfuseTrigger } from "../../types";

export async function listLangfuseTriggers(
  params: ListLangfuseTriggersParams = {}
): Promise<{ triggers: LangfuseTrigger[]; total: number }> {
  const { search, limit = 50, offset = 0 } = params;
  const client = getClient(params.tx);

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { promptName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [triggers, total] = await Promise.all([
    client.langfuseTrigger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    client.langfuseTrigger.count({ where }),
  ]);

  return { triggers, total };
}

export type ListLangfuseTriggersParams = {
  search?: string;
  limit?: number;
  offset?: number;
  tx?: Prisma.TransactionClient;
};
