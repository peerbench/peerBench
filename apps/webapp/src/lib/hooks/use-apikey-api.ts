import { ApiKeyProvider } from "@/database/types";
import { createApiCaller } from "@/utils/client/create-api-caller";
import { ResponseType } from "@/app/api/v2/profile/keys/[provider]/get";

const api = {
  getApiKey: (provider: ApiKeyProvider) => {
    const caller = createApiCaller<Record<string, never>, { key?: string }>(
      `/api/v2/profile/keys/${provider}`,
      {
        method: "GET",
        errorMessagePrefix: "Failed to get API key",
      }
    );

    return caller({}) as Promise<ResponseType>;
  },
};

export function useApiKeyApi() {
  return api;
}
