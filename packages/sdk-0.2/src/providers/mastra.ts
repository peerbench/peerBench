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

  override async forward(args: LLMProviderForwardArgs): Promise<ChatResponse> {
    const startedAt = Date.now();

    if (
      !this.warnedAboutSystemMessages &&
      args.messages.some((m) => m.role === "system")
    ) {
      this.warnedAboutSystemMessages = true;
      console.warn(
        `Mastra provider: system messages are ignored (agent "${args.model}" has baked-in prompts).`
      );
    }

    if (!this.warnedAboutResponseFormat && args.responseFormat) {
      this.warnedAboutResponseFormat = true;
      console.warn(
        `Mastra provider: responseFormat is ignored (configure structured output in the Mastra agent).`
      );
    }

    const apiMessages = args.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: String((m as any).content ?? ""),
      }));

    const agent = this.client.getAgent(args.model);
    const response = await agent.generate({
      messages: apiMessages,
      runtimeContext: {
        "model-id": args.model,
      },
    });

    return {
      data: response.text,
      startedAt,
      completedAt: Date.now(),
    };
  }
}
