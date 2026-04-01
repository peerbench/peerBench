import { getCachedDiscovery, upsertDiscovery } from "../db";
import { logger } from "../logger";
import { getDefaultStrategies } from "./strategies";
import type { DiscoveredSupabaseConfig, DiscoveryStrategy } from "./types";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const log = logger.child({ source: "supabase-discovery" });

/**
 * Discover Supabase config for a given API base URL.
 *
 * Resolution order:
 *  1. DB cache (if not stale)
 *  2. Run through registered strategies in order
 *  3. On success, persist to DB cache
 *
 * Returns null only when all strategies fail AND there is no cached entry.
 */
export async function discoverSupabaseConfig(
  apiBaseUrl: string,
  options?: DiscoverOptions
): Promise<DiscoveredSupabaseConfig | null> {
  const hostname = extractHostname(apiBaseUrl);
  if (!hostname) return null;

  const strategies = options?.strategies ?? getDefaultStrategies();
  const skipCache = options?.skipCache ?? false;

  if (!skipCache) {
    const cached = await getCachedDiscovery({ hostname });
    if (cached) {
      const ageMs = Date.now() - cached.updatedAt.getTime();
      if (ageMs < CACHE_TTL_MS) {
        log.debug(
          { hostname, strategyUsed: cached.strategyUsed, ageMs },
          "Using cached Supabase discovery"
        );
        return {
          supabaseUrl: cached.supabaseUrl,
          supabaseApiKey: cached.supabaseApiKey,
        };
      }
      log.info(
        { hostname, ageMs },
        "Cached Supabase discovery is stale, re-discovering"
      );
    }
  }

  for (const strategy of strategies) {
    log.info(
      { hostname, strategy: strategy.name },
      "Trying Supabase discovery strategy"
    );

    try {
      const result = await strategy.discover(apiBaseUrl);
      if (result) {
        log.info(
          { hostname, strategy: strategy.name, supabaseUrl: result.supabaseUrl },
          "Supabase config discovered"
        );

        await upsertDiscovery({
          hostname,
          supabaseUrl: result.supabaseUrl,
          supabaseApiKey: result.supabaseApiKey,
          strategyUsed: strategy.name,
        });

        return result;
      }

      log.debug(
        { hostname, strategy: strategy.name },
        "Strategy returned no result"
      );
    } catch (err) {
      log.warn(
        { hostname, strategy: strategy.name, error: String(err) },
        "Discovery strategy threw an error"
      );
    }
  }

  log.warn({ hostname }, "All discovery strategies failed");
  return null;
}

function extractHostname(urlString: string): string | null {
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

type DiscoverOptions = {
  strategies?: DiscoveryStrategy[];
  skipCache?: boolean;
};
