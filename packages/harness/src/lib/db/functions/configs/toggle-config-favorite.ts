import { Prisma, type Config } from "@prisma/client";
import { getClient } from "../../helpers";

export async function toggleConfigFavorite(
  params: ToggleConfigFavoriteParams
): Promise<Config | null> {
  const client = getClient(params.tx);
  const config = await client.config.findUnique({ where: { id: params.id } });
  if (!config) return null;

  return client.config.update({
    where: { id: params.id },
    data: { isFavorite: !config.isFavorite },
  });
}

export type ToggleConfigFavoriteParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
