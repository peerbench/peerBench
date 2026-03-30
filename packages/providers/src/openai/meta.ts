import { z } from "zod";

export default {
  configSchema: z.object({
    apiKey: z.string().describe("OpenAI API key."),
    baseURL: z.string().describe("Base URL for the OpenAI-compatible API endpoint."),
    model: z.string().describe("Model identifier (e.g. gpt-4o, gpt-4o-mini)."),
  }),
  aliases: ["OpenAIProvider"],
  description: "OpenAI-compatible provider (works with any OpenAI API-compatible endpoint)",
};
