import { OpenRouterProvider } from "peerbench/providers";
import { defineProviderEntry } from "@peerbench/core";
import meta from "./meta";

export default defineProviderEntry({
  ...meta,
  instantiateFromConfig(target, configSchema) {
    const { apiKey, model } = configSchema!.parse(target.params);
    const provider = new OpenRouterProvider({ apiKey });
    return provider.model({ model });
  },
  getEndpoint() {
    return "https://openrouter.ai/api/v1";
  },
});
