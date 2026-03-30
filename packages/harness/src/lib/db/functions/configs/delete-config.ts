import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";

export async function deleteConfig(params: DeleteConfigParams): Promise<void> {
  const client = getClient(params.tx);
  const config = await client.config.findUnique({
    where: { id: params.id },
  });
  if (!config) return;

  // If this is a group anchor (initialConfigId IS NULL) and has child versions,
  // delete all versions in the group first, then the anchor.
  if (config.initialConfigId === null) {
    const childIds = await client.config.findMany({
      where: { initialConfigId: params.id },
      select: { id: true },
    });

    if (childIds.length > 0) {
      await client.config.updateMany({
        where: { initialConfigId: params.id },
        data: { initialConfigId: null },
      });
      await client.config.deleteMany({
        where: { id: { in: childIds.map((c) => c.id) } },
      });
    }
  }

  await client.config.delete({ where: { id: params.id } });
}

export type DeleteConfigParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
