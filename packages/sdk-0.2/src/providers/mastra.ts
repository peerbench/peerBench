import {
  AbstractLLMProvider,
  type ChatResponse,
  type LLMProviderForwardArgs,
} from "./abstract/llm";

export class MastraProvider extends AbstractLLMProvider {
  override readonly kind = "mastra";

  private readonly endpoint: string;
  private readonly authToken: string;
  private readonly agentName: string;
  private client?: any;
  private clientInitPromise?: Promise<any>;
  private warnedAboutSystemMessages = false;
  private warnedAboutResponseFormat = false;

  constructor(params: { endpoint: string; authToken: string; agentName: string }) {
    super();
    this.endpoint = params.endpoint;
    this.authToken = params.authToken;
    this.agentName = params.agentName;
  }

  private async getClient(): Promise<any> {
    if (this.client) return this.client;
    if (this.clientInitPromise) return this.clientInitPromise;

    this.clientInitPromise = import("@mastra/client-js")
      .then((mod) => {
        const MastraClient = (mod as any)?.MastraClient;
        if (!MastraClient) {
          throw new Error(`@mastra/client-js did not export MastraClient`);
        }

        this.client = new MastraClient({
          baseUrl: this.endpoint,
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        });

        return this.client;
      })
      .catch((err) => {
        this.clientInitPromise = undefined;
        throw new Error(
          `MastraProvider requires optional peer dependency "@mastra/client-js" to be installed. ` +
            `Install it in your host application: npm i @mastra/client-js. ` +
            `Underlying error: ${err instanceof Error ? err.message : String(err)}`
        );
      });

    return this.clientInitPromise;
  }

  override async forward(args: LLMProviderForwardArgs): Promise<ChatResponse> {
    const startedAt = Date.now();

    if (!this.warnedAboutSystemMessages && args.messages.some((m) => m.role === "system")) {
      this.warnedAboutSystemMessages = true;
      console.warn(
        `Mastra provider: system messages are ignored (agent "${this.agentName}" has baked-in prompts).`
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

    const generateOptions: any = { messages: apiMessages };

    // Allow runtime model override via runtimeContext.
    // Model format: "provider/modelId" (e.g., "openai/gpt-4o", "anthropic/claude-3.5-sonnet").
    const parts = String(args.model ?? "").split("/");
    if (parts.length === 2) {
      const [providerId, modelId] = parts;
      generateOptions.runtimeContext = {
        "provider-id": providerId,
        "model-id": modelId,
      };
    } else if (args.model && args.model !== this.agentName) {
      generateOptions.runtimeContext = {
        "model-id": args.model,
      };
    }

    const client = await this.getClient();
    const agent = client.getAgent(this.agentName);
    const requestOptions = args.abortSignal ? ({ signal: args.abortSignal } as any) : undefined;
    const response = await agent.generate(generateOptions, requestOptions);

    const completedAt = Date.now();
    const text = (response as any)?.text ?? "";

    return {
      data: String(text),
      startedAt,
      completedAt,
    };
  }
}
