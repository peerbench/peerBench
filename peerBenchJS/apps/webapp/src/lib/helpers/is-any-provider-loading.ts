import { useProviders } from "../hooks/use-providers";

/**
 * Returns true if any of the providers is in loading state.
 */
export function isAnyProviderLoading(
  providers: ReturnType<typeof useProviders>
) {
  return Object.values(providers).some((provider) => provider.isLoading);
}
