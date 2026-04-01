import { z } from "zod";

export default {
  configSchema: z.object({
    apiKey: z.string().describe("OpenRouter API key."),
    model: z.string().describe("Model identifier (e.g. openai/gpt-4o, anthropic/claude-3.5-sonnet)."),
  }),
  aliases: ["OpenRouterProvider"],
  description: "OpenRouter provider with automatic model routing",
};
