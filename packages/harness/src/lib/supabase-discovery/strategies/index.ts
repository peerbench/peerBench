import type { DiscoveryStrategy } from "../types";
import { FrontendJsScrapingStrategy } from "./frontend-js-scraping";

/**
 * Ordered list of discovery strategies.
 * Strategies are tried top-to-bottom; the first non-null result wins.
 *
 * To add a new strategy (e.g. an `/auth/config` API endpoint check),
 * implement `DiscoveryStrategy` and add it here — order by reliability.
 */
export function getDefaultStrategies(): DiscoveryStrategy[] {
  return [
    // Add more strategies here as they become available, e.g.:
    // new ApiEndpointStrategy(),
    // new WellKnownEndpointStrategy(),
    new FrontendJsScrapingStrategy(),
  ];
}
