import {
  AbstractProvider,
  type CallableLLM,
  type CallableLLMForwardArgs,
  type LLMResponse,
} from "peerbench/providers";
import { MastraClient } from "@mastra/client-js";
import { PEERBENCH_NAMESPACE } from "peerbench";
import type { AgentMemoryOption } from "@mastra/core/agent";
import type { CoreMessage } from "@mastra/core/llm";
import type { ChunkType } from "@mastra/core/stream";
import {
  defineProviderEntry,
  parsePromptMetadataChunk,
  parsePromptMetadataHeader,
  parseTraceMetadataChunk,
  PROMPT_METADATA_HEADER,
  PROMPT_METADATA_KEY,
  TRACE_METADATA_KEY,
  type PromptMetadata,
  type TraceMetadata,
} from "@peerbench/core";
import { buildModelRequestContext } from "@/utils/model-context";
import meta from "./meta";

export class MastraAiSdkProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/mastra-ai-sdk-provider`
) {
  private readonly client: MastraClient;

  constructor(params: MastraAiSdkProviderConfig) {
    super();
    this.client = new MastraClient({
      baseUrl: params.endpoint.replace(/\/$/, ""),
      headers: params.authToken
        ? { Authorization: `Bearer ${params.authToken}` }
        : undefined,
    });
  }

  agent(config: {
    agentId: string;
    modelId?: string;
    memory?: AgentMemoryOption;
  }): CallableLLM<MastraAiSdkProvider> {
    return {
      slug: config.agentId,
      provider: this,
      forward: async (args: CallableLLMForwardArgs): Promise<LLMResponse> => {
        const startedAt = Date.now();
        const mastraAgent = this.client.getAgent(config.agentId);
        const messages = args.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map<CoreMessage>((m) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          }));
        const requestContext = config.modelId ? buildModelRequestContext(config.modelId) : undefined;
        const response = await mastraAgent.stream(messages, { requestContext });
        if (!response.body) throw new Error("Mastra stream response has no body");
        const headerPromptMeta = parsePromptMetadataHeader(response.headers.get(PROMPT_METADATA_HEADER));
        let text = "";
        let reasoning = "";
        let inputTokensUsed: number | undefined;
        let outputTokensUsed: number | undefined;
        let firstTokenAt: number | undefined;
        let chunkPromptMeta: PromptMetadata | undefined;
        let chunkTraceMeta: TraceMetadata | undefined;
        await response.processDataStream({
          onChunk: async (chunk: ChunkType) => {
            if ((chunk.type === "text-start" || chunk.type === "text-delta") && firstTokenAt === undefined) {
              firstTokenAt = Date.now();
            }
            if (chunk.type === "text-delta") {
              const payload = chunk.payload as { text?: string };
              if (payload.text) text += payload.text;
            }
            if (chunk.type === "reasoning-delta") {
              const payload = chunk.payload as { text?: string };
              if (payload.text) reasoning += payload.text;
            }
            if (chunk.type === "finish") {
              const payload = chunk.payload as { output?: { usage?: { inputTokens?: number; outputTokens?: number } } };
              if (payload.output?.usage) {
                inputTokensUsed = payload.output.usage.inputTokens;
                outputTokensUsed = payload.output.usage.outputTokens;
              }
            }
            if (chunk.type === "step-finish") {
              const payload = chunk.payload as { totalUsage?: { inputTokens?: number; outputTokens?: number } };
              if (payload.totalUsage) {
                inputTokensUsed = payload.totalUsage.inputTokens;
                outputTokensUsed = payload.totalUsage.outputTokens;
              }
            }
            if (chunk.type === "data-prompt-metadata") {
              const dataChunk = chunk as { data: unknown };
              chunkPromptMeta = parsePromptMetadataChunk(dataChunk.data);
            }
            if (chunk.type === "data-trace-metadata") {
              const dataChunk = chunk as { data: unknown };
              chunkTraceMeta = parseTraceMetadataChunk(dataChunk.data);
            }
          },
        });
        const completedAt = Date.now();
        const metadata: Record<string, unknown> = {};
        if (reasoning.trim().length > 0) metadata.reasoning = reasoning;
        const resolvedPromptMeta = headerPromptMeta ?? chunkPromptMeta;
        if (resolvedPromptMeta) metadata[PROMPT_METADATA_KEY] = resolvedPromptMeta;
        if (chunkTraceMeta) metadata[TRACE_METADATA_KEY] = chunkTraceMeta;
        const timeToFirstToken = firstTokenAt !== undefined ? firstTokenAt - startedAt : undefined;
        return {
          startedAt,
          completedAt,
          data: text,
          inputTokensUsed,
          outputTokensUsed,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
          timeToFirstToken,
        };
      },
    };
  }
}

type MastraAiSdkProviderConfig = {
  endpoint: string;
  authToken?: string;
};

export default defineProviderEntry({
  ...meta,
  instantiateFromConfig(target, configSchema) {
    const { endpoint, authToken, agentId, modelId } = configSchema!.parse(target.params);
    const provider = new MastraAiSdkProvider({ endpoint, authToken });
    return provider.agent({ agentId, modelId });
  },
  getEndpoint(target, configSchema) {
    const { endpoint } = configSchema!.parse(target.params);
    return endpoint;
  },
});
