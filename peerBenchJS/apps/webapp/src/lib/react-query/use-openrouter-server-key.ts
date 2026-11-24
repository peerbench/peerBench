import { useQuery } from "@tanstack/react-query";
import { QK_OPENROUTER_SERVER_KEY } from "./query-keys";
import { ApiKeyProviders } from "@/database/types";
import { useApiKeyApi } from "../hooks/use-apikey-api";

export function useOpenRouterServerKey(autoFetch: boolean = true) {
  const { getApiKey } = useApiKeyApi();
  return useQuery({
    queryKey: [QK_OPENROUTER_SERVER_KEY],
    queryFn: () => getApiKey(ApiKeyProviders.openrouter).then((res) => res.key),
    throwOnError: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    enabled: autoFetch,
  });
}
