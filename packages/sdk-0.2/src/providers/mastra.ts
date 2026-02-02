import { PEERBENCH_NAMESPACE } from "@/constants";
import { AbstractProvider } from "./abstract";
import {
  type CallableLLM,
  type LLMResponse,
  type CallableLLMForwardArgs,
} from "./callables/llm";
import { MastraClient, type GetAgentResponse } from "@mastra/client-js";
import type { RequestContext } from "@mastra/core/request-context";
import { AgentMemoryOption } from "@mastra/core/agent";
import { ProviderOptions } from "@mastra/core/dist/llm/model/provider-options";
import { CoreMessage } from "@mastra/core/llm";

export class MastraProvider extends AbstractProvider.withKind(
  `${PEERBENCH_NAMESPACE}/llm/mastra`
) {
  private readonly endpoint: string;
  private readonly authToken?: string;
  private client: MastraClient;

  constructor(params: { endpoint: string; authToken?: string }) {
    super();
    this.endpoint = params.endpoint;
    this.authToken = params.authToken;
    this.client = new MastraClient({
      baseUrl: this.endpoint,
      headers: this.authToken
        ? {
          Authorization: `Bearer ${this.authToken}`,
        }
        : undefined,
    });
  }

  async getAgentInfo(args: {
    agentId: string;
    requestContext?: RequestContext;
  }) {
    return await this.client
      .getAgent(args.agentId)
      .details(args.requestContext);
  }

  async getAgents(params?: {
    requestContext?: RequestContext;
    partial?: boolean;
  }): Promise<Record<string, GetAgentResponse>> {
    return this.client.listAgents(params?.requestContext, params?.partial);
  }

  agent(config: {
    agentId: string;
    memory?: AgentMemoryOption;
    requestContext?: RequestContext;
    providerOptions?: ProviderOptions;
  }): CallableLLM<MastraProvider> {
    return {
      slug: config.agentId,
      provider: this,
      forward: async (
        args: CallableLLMForwardArgs
      ): Promise<LLMResponse> => {
        const apiMessages = args.messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map<CoreMessage>((m) => ({
            role: m.role,
            content: String(m.content ?? ""),
          }));

        const agent = this.client.getAgent(config.agentId);
        const startedAt = Date.now();

        const response = await agent.stream(
          apiMessages,
          {
            providerOptions: config.providerOptions,
            memory: config.memory,
            requestContext: config.requestContext,
          }
        );

        let text = "";
        let firstTokenAt: number | undefined;
        let inputTokensUsed: number | undefined;
        let outputTokensUsed: number | undefined;
        const metadata: Record<string, unknown> = {};

        await response.processDataStream({
          onChunk: async (chunk) => {
            if (chunk.type === "text-delta") {
              if (firstTokenAt === undefined) {
                firstTokenAt = Date.now();
              }
              const payload = chunk.payload as { text?: string };
              text += payload.text ?? "";
            }

            if (chunk.type === "finish") {
              const payload = chunk.payload as {
                output?: {
                  usage?: {
                    inputTokens?: number;
                    outputTokens?: number;
                  };
                };
              };
              inputTokensUsed = payload.output?.usage?.inputTokens;
              outputTokensUsed = payload.output?.usage?.outputTokens;
            }
          },
        });

        return {
          data: text,
          startedAt,
          completedAt: Date.now(),
          inputTokensUsed,
          outputTokensUsed,
          timeToFirstToken:
            firstTokenAt !== undefined ? firstTokenAt - startedAt : undefined,
          metadata:
            Object.keys(metadata).length > 0 ? metadata : undefined,
        };
      },
    };
  }
}
