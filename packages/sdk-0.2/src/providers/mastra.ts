import {
  AbstractLLMProvider,
  type ChatResponse,
  type LLMProviderForwardArgs,
} from "./abstract/llm";
import { MastraClient, type GetAgentResponse } from "@mastra/client-js";

export class MastraProvider extends AbstractLLMProvider {
  override readonly kind = "mastra";

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

  override async forward(
    args: LLMProviderForwardArgs & {
      memory?: AgentMemoryOption;
    }
  ): Promise<ChatResponse> {
    const apiMessages = args.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String((m as any).content ?? ""),
      }));

    const agent = this.client.getAgent(args.model);

    const startedAt = Date.now();
    const response = await agent.generate(
      {
        messages: apiMessages,
        runtimeContext: {
          "model-id": args.model,
        },
      },
      { memory: args.memory }
    );

    return {
      data: response.text,
      startedAt,
      completedAt: Date.now(),
    };
  }

  async getAgentInfo(args: {
    agentId: string;
    runtimeContext?: MastraRuntimeContext;
  }) {
    return await this.client
      .getAgent(args.agentId)
      .details(args.runtimeContext);
  }

  async getAgents(args?: {
    runtimeContext?: MastraRuntimeContext;
    partial?: boolean;
  }): Promise<Record<string, GetAgentResponse>> {
    return this.client.getAgents(args?.runtimeContext, args?.partial);
  }
}

// NOTE: Mastra client does not export these types
export type AgentMemoryOption = Parameters<
  Parameters<MastraClient["getAgent"]>["0"] extends string
    ? ReturnType<MastraClient["getAgent"]>["generate"]
    : never
>[0] extends { memory?: infer M }
  ? M
  : never;

type MastraRuntimeContext = Parameters<
  Parameters<MastraClient["getAgent"]>["0"] extends string
    ? ReturnType<MastraClient["getAgent"]>["generate"]
    : never
>[0] extends { runtimeContext?: infer R }
  ? R
  : never;
