import {
  AbstractLLMProvider,
  type ChatResponse,
  type LLMProviderForwardArgs,
} from "./abstract/llm";
import { MastraClient } from "@mastra/client-js";

export class MastraProvider extends AbstractLLMProvider {
  override readonly kind = "mastra";

  private readonly endpoint: string;
  private readonly authToken?: string;
  private client: MastraClient;
  private warnedAboutSystemMessages = false;
  private warnedAboutResponseFormat = false;

  constructor(params: { endpoint: string; authToken?: string }) {
    super();
    this.endpoint = params.endpoint;
    this.authToken = params.authToken;
    this.client = new MastraClient({
      baseUrl: this.endpoint,
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
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
}

// NOTE: Mastra client does not export this type
export type AgentMemoryOption = Parameters<
  Parameters<MastraClient["getAgent"]>["0"] extends string
    ? ReturnType<MastraClient["getAgent"]>["generate"]
    : never
>[0] extends { memory?: infer M }
  ? M
  : never;
