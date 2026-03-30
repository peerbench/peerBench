import { AbstractScorer, type BaseScorerResult } from "peerbench/scorers";
import type { CallableLLM } from "peerbench/providers";
import { PEERBENCH_NAMESPACE } from "peerbench";
import { defineScorerEntry, type ProviderEntry } from "@peerbench/core";
import meta from "./meta";

function buildMemoryAnalysisPrompt(
  conversationHistory: ConversationMessage[]
): string {
  const formatted = conversationHistory
    .map((m, i) => {
      const turn = Math.floor(i / 2) + 1;
      const role = m.role === "user" ? "Customer" : "Agent";
      return `Turn ${turn} - ${role}: ${m.content}`;
    })
    .join("\n\n");

  return `Analyze this conversation for memory lapses - cases where the agent asks for information that the customer already provided earlier.

## Conversation
${formatted}

## Instructions
1. Identify any instances where the agent asks for information that was already given by the customer
2. For each memory lapse found, note:
   - The turn number where the agent asked again
   - What information the customer had already provided
   - The exact question/request the agent made that shows they forgot

## Response Format
Respond in JSON format:
{
  "memoryLapses": [
    {
      "turn": <number>,
      "forgottenInfo": "<what the customer already provided>",
      "askedAgain": "<what the agent asked/requested>"
    }
  ],
  "explanation": "<brief summary of memory consistency>"
}

If no memory lapses were found, return an empty array for memoryLapses and note "No memory lapses detected" in the explanation.

JSON Response:`;
}

function parseMemoryAnalysisResponse(response: string): {
  memoryLapses: MemoryLapse[];
  explanation: string;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        memoryLapses: parsed.memoryLapses || [],
        explanation: parsed.explanation || "Analysis complete",
      };
    }
  } catch {
    // Parsing failed, return empty result
  }

  return {
    memoryLapses: [],
    explanation: "Unable to parse memory analysis response",
  };
}

function calculateScore(lapseCount: number): number {
  return lapseCount > 0 ? 0 : 1.0;
}

export class MemoryConsistencyScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/memory-consistency.scorer`
) {
  private callable: CallableLLM;

  constructor(config: { callable: CallableLLM }) {
    super();
    this.callable = config.callable;
  }

  async score(params: {
    conversationHistory: ConversationMessage[];
  }): Promise<MemoryConsistencyResult> {
    const { conversationHistory } = params;

    if (conversationHistory.length < 4) {
      return {
        value: 1.0,
        memoryLapses: [],
        explanation: "Conversation too short to assess memory consistency",
      };
    }

    const prompt = buildMemoryAnalysisPrompt(conversationHistory);

    const response = await this.callable.forward({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const { memoryLapses, explanation } = parseMemoryAnalysisResponse(
      response.data
    );
    const value = calculateScore(memoryLapses.length);

    return {
      value,
      memoryLapses,
      explanation:
        memoryLapses.length === 0
          ? "No memory lapses detected - agent maintained good recall throughout the conversation"
          : `Found ${memoryLapses.length} memory lapse(s): ${explanation}`,
    };
  }
}

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type MemoryLapse = {
  turn: number;
  forgottenInfo: string;
  askedAgain: string;
};

export type MemoryConsistencyResult = BaseScorerResult & {
  memoryLapses: MemoryLapse[];
};

export function createEntry(providerRegistry: {
  find(name: string): ProviderEntry;
}) {
  return defineScorerEntry({
    ...meta,
    instantiateFromConfig(config, configSchema) {
      const { judgeProvider } = configSchema!.parse(config);
      const callable = providerRegistry
        .find(judgeProvider.provider)
        .instantiateFromConfig(judgeProvider);
      return new MemoryConsistencyScorer({ callable });
    },
  });
}

export default createEntry;
