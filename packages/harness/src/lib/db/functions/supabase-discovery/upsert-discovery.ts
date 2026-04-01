import type { Prisma, SupabaseDiscoveryCache } from "@prisma/client";
import { getClient } from "../../helpers";

export async function upsertDiscovery(
  params: UpsertDiscoveryParams
): Promise<SupabaseDiscoveryCache> {
  const client = getClient(params.tx);
  return client.supabaseDiscoveryCache.upsert({
    where: { hostname: params.hostname },
    create: {
      hostname: params.hostname,
      supabaseUrl: params.supabaseUrl,
      supabaseApiKey: params.supabaseApiKey,
      strategyUsed: params.strategyUsed,
    },
    update: {
      supabaseUrl: params.supabaseUrl,
      supabaseApiKey: params.supabaseApiKey,
      strategyUsed: params.strategyUsed,
      discoveredAt: new Date(),
    },
  });
}

export type UpsertDiscoveryParams = {
  hostname: string;
  supabaseUrl: string;
  supabaseApiKey: string;
  strategyUsed: string;
  tx?: Prisma.TransactionClient;
};
