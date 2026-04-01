import { discoverSupabaseConfig } from "./discover";
import { logger } from "../logger";

const log = logger.child({ source: "resolve-supabase-discovery" });

/**
 * Pre-processing step that runs before `resolveSupabaseAuthInConfig`.
 *
 * For every target that uses Supabase auth (has email + password) and
 * has a `baseUrl`, we auto-discover the correct `supabaseUrl` and
 * `supabaseApiKey` for that specific endpoint — overriding any values
 * from the config. This ensures each target always authenticates
 * against the right Supabase instance, even when configs are shared
 * across environments (e.g. staging vs PR previews).
 *
 * Skip discovery only when:
 *  - The target already has a direct `authToken` (no Supabase needed)
 *  - The target has no `baseUrl` (nothing to discover from)
 *  - The target explicitly opts out with `skipSupabaseDiscovery: true`
 */
export async function resolveSupabaseDiscoveryInConfig(
  config: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const targets = config.targets;
  if (!Array.isArray(targets)) return config;

  let changed = false;
  const resolvedTargets: Record<string, unknown>[] = [];

  for (const target of targets) {
    if (typeof target !== "object" || target === null) {
      resolvedTargets.push(target as Record<string, unknown>);
      continue;
    }

    const t = target as Record<string, unknown>;
    const params = t.params;

    if (typeof params !== "object" || params === null) {
      resolvedTargets.push(t);
      continue;
    }

    const p = params as Record<string, unknown>;

    if (!shouldDiscover(p)) {
      resolvedTargets.push(t);
      continue;
    }

    const baseUrl = p.baseUrl as string;
    const targetName = String(t.name || t.provider || "unknown");

    log.info(
      { targetName, baseUrl },
      "Auto-discovering Supabase config for target"
    );

    const discovered = await discoverSupabaseConfig(baseUrl);
    if (!discovered) {
      log.warn(
        { targetName, baseUrl },
        "Could not discover Supabase config, falling back to config values"
      );
      resolvedTargets.push(t);
      continue;
    }

    log.info(
      { targetName, baseUrl, supabaseUrl: discovered.supabaseUrl },
      "Injected discovered Supabase config into target"
    );

    resolvedTargets.push({
      ...t,
      params: {
        ...p,
        supabaseUrl: discovered.supabaseUrl,
        supabaseApiKey: discovered.supabaseApiKey,
      },
    });
    changed = true;
  }

  if (!changed) return config;

  return { ...config, targets: resolvedTargets };
}

/**
 * Determines whether discovery should run for a target.
 *
 * Discovery runs when ALL of these are true:
 *  - Target has Supabase login credentials (email + password)
 *  - Target has a `baseUrl` to discover from
 *  - Target does not already have a direct `authToken`
 *  - Target has not opted out with `skipSupabaseDiscovery: true`
 *
 * Note: even if `supabaseUrl`/`supabaseApiKey` are already set, we
 * still discover — the config may have been created for one environment
 * but the target's `baseUrl` may point to a different one.
 */
function shouldDiscover(params: Record<string, unknown>): boolean {
  if (params.skipSupabaseDiscovery === true) return false;

  const hasCredentials =
    typeof params.supabaseEmail === "string" &&
    typeof params.supabasePassword === "string";

  const hasDirect =
    typeof params.authToken === "string" &&
    (params.authToken as string).length > 0;

  const hasBaseUrl =
    typeof params.baseUrl === "string" &&
    (params.baseUrl as string).length > 0;

  return hasCredentials && !hasDirect && hasBaseUrl;
}
