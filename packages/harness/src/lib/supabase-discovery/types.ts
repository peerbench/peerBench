/**
 * Result of a successful Supabase config discovery.
 */
export type DiscoveredSupabaseConfig = {
  supabaseUrl: string;
  supabaseApiKey: string;
};

/**
 * A strategy that can discover Supabase config from an API base URL.
 *
 * Strategies are tried in priority order. Each strategy should return `null`
 * if it cannot discover the config (rather than throwing), so the next
 * strategy in the chain can be tried.
 *
 * To add a new strategy:
 *  1. Implement this interface
 *  2. Register it in `strategies.ts`
 */
export interface DiscoveryStrategy {
  /** Unique name for logging and DB `strategyUsed` column. */
  readonly name: string;

  /**
   * Attempt to discover the Supabase config for the given API base URL.
   * Return `null` if this strategy doesn't apply or fails.
   */
  discover(apiBaseUrl: string): Promise<DiscoveredSupabaseConfig | null>;
}
