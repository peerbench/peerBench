import {
  AbstractProvider,
  type CallableLLM,
  type CallableLLMForwardArgs,
  type LLMResponse,
} from "peerbench/providers";
import { randomUUID } from "node:crypto";
import { PEERBENCH_NAMESPACE } from "peerbench";
import type { AgentMemoryOption } from "@mastra/core/agent";
import {
  defineProviderEntry,
  RAW_REQUEST_METADATA_KEY,
  type RawRequestMetadata,
} from "@peerbench/core";
import meta from "./meta";

export class StatefulChatApiProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/stateful-chat-api`
) {
  private readonly baseUrl: string;
  private readonly authToken?: string;

  constructor(config: StatefulChatApiProviderConfig) {
    super();
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.authToken = config.authToken;
  }

  agent(config: {
    endpoint: string;
    modelId?: string;
    memory?: AgentMemoryOption;
  }): CallableLLM<StatefulChatApiProvider> {
    const slug = config.modelId ? `${config.modelId}:${config.endpoint}` : config.endpoint;
    return {
      slug,
      provider: this,
      forward: async (args: CallableLLMForwardArgs): Promise<LLMResponse> => {
        const startedAt = Date.now();
        const messages = args.messages.map((msg) => ({
          role: msg.role as "user" | "assistant" | "system",
          content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
        }));
        const body = {
          messages,
          memory: {
            thread: config.memory?.thread ?? randomUUID(),
            resource: config.memory?.resource ?? randomUUID(),
          },
          modelId: config.modelId ?? null,
          modelOverride: config.modelId ?? null,
          aiSettings: {
            modelId: config.modelId ?? null,
            modelOverride: config.modelId ?? null,
            temperature: args.temperature ?? 0,
          },
        };
        const url = `${this.baseUrl}${config.endpoint}`;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.authToken) headers["Authorization"] = `Bearer ${this.authToken}`;
        const rawRequest: RawRequestMetadata = { url, method: "POST", headers: { ...headers }, body };
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: args.abortSignal,
        });
        rawRequest.response = { status: response.status, statusText: response.statusText };
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`StatefulChatApi request to ${url} failed: ${response.status} ${response.statusText} - ${errorText}`);
        }
        const data = (await response.json()) as Record<string, unknown>;
        const completedAt = Date.now();
        const { message: responseText, ...rest } = data;
        return {
          startedAt,
          completedAt,
          data: typeof responseText === "string" ? responseText : JSON.stringify(responseText),
          metadata: { [RAW_REQUEST_METADATA_KEY]: rawRequest, ...rest },
        };
      },
    };
  }
}

type StatefulChatApiProviderConfig = {
  baseUrl: string;
  authToken?: string;
};

export default defineProviderEntry({
  ...meta,
  instantiateFromConfig(target, configSchema) {
    const parsed = configSchema!.parse(target.params);
    const provider = new StatefulChatApiProvider({ baseUrl: parsed.baseUrl, authToken: parsed.authToken });
    return provider.agent({ endpoint: parsed.endpoint, modelId: parsed.modelId });
  },
  getEndpoint(target, configSchema) {
    const { baseUrl } = configSchema!.parse(target.params);
    return baseUrl;
  },
});
