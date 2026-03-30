import type { Prisma, SupabaseDiscoveryCache } from "@prisma/client";
import { getClient } from "../../helpers";

export async function getCachedDiscovery(
  params: GetCachedDiscoveryParams
): Promise<SupabaseDiscoveryCache | null> {
  const client = getClient(params.tx);
  return client.supabaseDiscoveryCache.findUnique({
    where: { hostname: params.hostname },
  });
}

export type GetCachedDiscoveryParams = {
  hostname: string;
  tx?: Prisma.TransactionClient;
};
