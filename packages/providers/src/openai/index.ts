import { OpenAIProvider } from "peerbench/providers";
import { defineProviderEntry } from "@peerbench/core";
import meta from "./meta";

export default defineProviderEntry({
  ...meta,
  instantiateFromConfig(target, configSchema) {
    const { apiKey, baseURL, model } = configSchema!.parse(target.params);
    const provider = new OpenAIProvider({ apiKey, baseURL });
    return provider.model({ model });
  },
  getEndpoint(target, configSchema) {
    const { baseURL } = configSchema!.parse(target.params);
    return baseURL;
  },
});
