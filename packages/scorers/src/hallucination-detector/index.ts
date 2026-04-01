import {
  AbstractScorer,
  type BaseScorerResult,
  type CallableLLM,
  PEERBENCH_NAMESPACE,
  defineScorerEntry,
  type ProviderEntry,
} from "@peerbench/core";
import meta from "./meta";

function extractCustomerFacts(
  conversationHistory: ConversationMessage[]
): string {
  const customerMessages = conversationHistory
    .filter((m) => m.role === "user")
    .map((m, i) => `- Message ${i + 1}: "${m.content}"`)
    .join("\n");

  return customerMessages || "(No customer messages)";
}

function buildHallucinationDetectionPrompt(
  conversationHistory: ConversationMessage[]
): string {
  const formatted = conversationHistory
    .map((m, i) => {
      const turn = Math.floor(i / 2) + 1;
      const role = m.role === "user" ? "Customer" : "Agent";
      return `Turn ${turn} - ${role}: ${m.content}`;
    })
    .join("\n\n");

  const customerFacts = extractCustomerFacts(conversationHistory);

  return `Analyze this conversation for hallucinations - cases where the agent states facts about the customer's situation that were NOT provided by the customer or that contradict what the customer said.

## Information Provided by Customer
${customerFacts}

## Full Conversation
${formatted}

## Instructions
Look for cases where the agent:
1. States specific details (names, numbers, dates, locations, etc.) that the customer never mentioned
2. Makes assumptions about the customer's situation that weren't confirmed
3. Contradicts information the customer explicitly provided
4. Fabricates details to fill gaps in information

Do NOT flag:
- General statements or standard procedures
- Reasonable inferences clearly presented as questions
- Information the agent would legitimately know (their own policies, processes, etc.)

## Response Format
Respond in JSON format:
{
  "hallucinations": [
    {
      "turn": <number>,
      "claimedFact": "<what the agent claimed>",
      "source": "<one of: not_provided, contradicts_customer, fabricated>",
      "severity": "<one of: minor, moderate, severe>"
    }
  ],
  "explanation": "<brief summary of hallucination analysis>"
}

Severity guidelines:
- minor: Small assumption that doesn't affect the interaction significantly
- moderate: Incorrect detail that could cause confusion
- severe: Fabricated or contradictory fact that could lead to wrong outcomes

If no hallucinations were found, return an empty array.

JSON Response:`;
}

function parseHallucinationResponse(response: string): {
  hallucinations: Hallucination[];
  explanation: string;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hallucinations: (parsed.hallucinations || []).map((h: any) => ({
          turn: h.turn,
          claimedFact: h.claimedFact,
          source: h.source as HallucinationSource,
          severity: h.severity,
        })),
        explanation: parsed.explanation || "Analysis complete",
      };
    }
  } catch {
    // Parsing failed
  }

  return {
    hallucinations: [],
    explanation: "Unable to parse hallucination analysis response",
  };
}

function calculateScore(hallucinations: Hallucination[]): number {
  return hallucinations.length > 0 ? 0 : 1.0;
}

export class HallucinationDetectorScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/hallucination-detector.scorer`
) {
  private callable: CallableLLM;

  constructor(config: { callable: CallableLLM }) {
    super();
    this.callable = config.callable;
  }

  async score(params: {
    conversationHistory: ConversationMessage[];
  }): Promise<HallucinationDetectionResult> {
    const { conversationHistory } = params;

    if (conversationHistory.length < 2) {
      return {
        value: 1.0,
        hallucinations: [],
        explanation: "Conversation too short to assess hallucinations",
      };
    }

    const prompt = buildHallucinationDetectionPrompt(conversationHistory);

    const response = await this.callable.forward({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const { hallucinations, explanation } = parseHallucinationResponse(
      response.data
    );
    const value = calculateScore(hallucinations);

    const severityCounts = hallucinations.reduce(
      (acc, h) => {
        acc[h.severity || "moderate"]++;
        return acc;
      },
      { minor: 0, moderate: 0, severe: 0 }
    );

    return {
      value,
      hallucinations,
      explanation:
        hallucinations.length === 0
          ? "No hallucinations detected - agent only stated facts provided by the customer"
          : `Found ${hallucinations.length} hallucination(s): ${severityCounts.severe} severe, ${severityCounts.moderate} moderate, ${severityCounts.minor} minor. ${explanation}`,
    };
  }
}

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type HallucinationSource =
  | "not_provided"
  | "contradicts_customer"
  | "fabricated";

export type Hallucination = {
  turn: number;
  claimedFact: string;
  source: HallucinationSource;
  severity?: "minor" | "moderate" | "severe";
};

export type HallucinationDetectionResult = BaseScorerResult & {
  hallucinations: Hallucination[];
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
      return new HallucinationDetectorScorer({ callable });
    },
  });
}

export default createEntry;
