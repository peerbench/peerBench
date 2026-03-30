import { z } from "zod";

export default {
  configSchema: z.object({
    baseUrl: z.string().describe("Base URL of the chat API server."),
    authToken: z.string().optional().describe("Bearer token for authentication."),
    endpoint: z.string().describe("API endpoint path for chat messages."),
    modelId: z.string().optional().describe("Underlying model identifier."),
  }),
  aliases: ["StatefulChatApiProvider"],
  description: "Generic stateful chat provider for non-OpenAI REST APIs with server-side thread/memory management",
};
