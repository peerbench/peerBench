import type { DiscoveryStrategy, DiscoveredSupabaseConfig } from "../types";

const SUPABASE_URL_RE = /https:\/\/[a-z]+\.supabase\.co/g;
const SUPABASE_ANON_KEY_RE =
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const JS_CHUNK_RE = /\/_next\/static\/chunks\/[^"']+\.js[^"']*/g;

/**
 * Discovers Supabase config by scraping JS bundles from the frontend.
 *
 * Assumes a URL convention: if the API is at `pr-195.api.renisa.ai`,
 * the frontend is at `pr-195.renisa.ai`. Override the mapping by
 * subclassing or by adding a new strategy.
 */
export class FrontendJsScrapingStrategy implements DiscoveryStrategy {
  readonly name = "frontend-js-scraping";

  async discover(
    apiBaseUrl: string
  ): Promise<DiscoveredSupabaseConfig | null> {
    const frontendUrl = this.deriveFrontendUrl(apiBaseUrl);
    if (!frontendUrl) return null;

    const entryUrl = `${frontendUrl}/dashboard`;

    const html = await safeFetch(entryUrl);
    if (!html) return null;

    const chunkPaths = [...new Set(html.match(JS_CHUNK_RE) || [])];
    if (chunkPaths.length === 0) return null;

    const frontendOrigin = new URL(frontendUrl).origin;

    const results = await Promise.all(
      chunkPaths.map(async (path) => {
        const content = await safeFetch(`${frontendOrigin}${path}`);
        if (!content) return null;
        return extractSupabaseConfig(content);
      })
    );

    return results.find((r) => r !== null) ?? null;
  }

  /**
   * Derive the frontend URL from an API base URL.
   * Default convention: `xxx.api.domain` → `xxx.domain`
   *
   * Returns null if the URL doesn't follow a known pattern.
   */
  protected deriveFrontendUrl(apiBaseUrl: string): string | null {
    try {
      const url = new URL(apiBaseUrl);
      if (!url.hostname.includes(".api.")) return null;
      const frontendHost = url.hostname.replace(".api.", ".");
      return `https://${frontendHost}`;
    } catch {
      return null;
    }
  }
}

function extractSupabaseConfig(
  jsContent: string
): DiscoveredSupabaseConfig | null {
  const urls = jsContent.match(SUPABASE_URL_RE);
  const keys = jsContent.match(SUPABASE_ANON_KEY_RE);

  if (!urls || urls.length === 0 || !keys || keys.length === 0) return null;

  return {
    supabaseUrl: urls[0],
    supabaseApiKey: keys[0],
  };
}

async function safeFetch(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}
