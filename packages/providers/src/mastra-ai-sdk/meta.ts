import { z } from "zod";

export default {
  configSchema: z.object({
    endpoint: z.string().describe("Base URL of the Mastra server."),
    authToken: z.string().optional().describe("Bearer token for authentication."),
    agentId: z.string().describe("Mastra agent identifier."),
    modelId: z.string().optional().describe("Model identifier to forward via request context."),
  }),
  aliases: ["MastraAiSdkProvider"],
  description: "Mastra AI SDK streaming provider with Time To First Token measurement",
};
