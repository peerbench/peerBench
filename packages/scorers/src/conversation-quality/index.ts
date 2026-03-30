import { AbstractScorer, type BaseScorerResult } from "peerbench/scorers";
import type { CallableLLM } from "peerbench/providers";
import { PEERBENCH_NAMESPACE } from "peerbench";
import { defineScorerEntry, type ProviderEntry } from "@peerbench/core";
import meta from "./meta";

function buildQualityAnalysisPrompt(
  conversationHistory: ConversationMessage[]
): string {
  const formatted = conversationHistory
    .map((m, i) => {
      const turn = Math.floor(i / 2) + 1;
      const role = m.role === "user" ? "Customer" : "Agent";
      return `Turn ${turn} - ${role}: ${m.content}`;
    })
    .join("\n\n");

  return `Evaluate the overall quality of the agent's responses in this conversation across multiple dimensions.

## Conversation
${formatted}

## Evaluation Dimensions

1. **Clarity** (0.0 - 1.0)
   - Are the agent's responses easy to understand?
   - Is the language clear and unambiguous?
   - Are instructions and explanations well-structured?

2. **Helpfulness** (0.0 - 1.0)
   - Does the agent address the customer's needs?
   - Are responses relevant and useful?
   - Does the agent proactively provide helpful information?

3. **Professionalism** (0.0 - 1.0)
   - Is the tone appropriate and respectful?
   - Does the agent maintain composure?
   - Is the communication style suitable for the context?

4. **Efficiency** (0.0 - 1.0)
   - Does the agent get to the point?
   - Are there unnecessary repetitions or tangents?
   - Is the conversation moving toward resolution?

## Response Format
Respond in JSON format:
{
  "dimensions": {
    "clarity": <0.0 to 1.0>,
    "helpfulness": <0.0 to 1.0>,
    "professionalism": <0.0 to 1.0>,
    "efficiency": <0.0 to 1.0>
  },
  "explanation": "<brief explanation of the assessment>"
}

JSON Response:`;
}

function parseQualityResponse(response: string): {
  dimensions: QualityDimensions;
  explanation: string;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const dims = parsed.dimensions || {};
      return {
        dimensions: {
          clarity: Math.min(1, Math.max(0, dims.clarity ?? 0.5)),
          helpfulness: Math.min(1, Math.max(0, dims.helpfulness ?? 0.5)),
          professionalism: Math.min(
            1,
            Math.max(0, dims.professionalism ?? 0.5)
          ),
          efficiency: Math.min(1, Math.max(0, dims.efficiency ?? 0.5)),
        },
        explanation: parsed.explanation || "Analysis complete",
      };
    }
  } catch {
    // Parsing failed
  }

  return {
    dimensions: {
      clarity: 0.5,
      helpfulness: 0.5,
      professionalism: 0.5,
      efficiency: 0.5,
    },
    explanation: "Unable to parse quality analysis response",
  };
}

function calculateOverallScore(dimensions: QualityDimensions): number {
  const weights = {
    clarity: 0.25,
    helpfulness: 0.3,
    professionalism: 0.2,
    efficiency: 0.25,
  };

  return (
    dimensions.clarity * weights.clarity +
    dimensions.helpfulness * weights.helpfulness +
    dimensions.professionalism * weights.professionalism +
    dimensions.efficiency * weights.efficiency
  );
}

export class ConversationQualityScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/conversation-quality.scorer`
) {
  private callable: CallableLLM;

  constructor(config: { callable: CallableLLM }) {
    super();
    this.callable = config.callable;
  }

  async score(params: {
    conversationHistory: ConversationMessage[];
  }): Promise<ConversationQualityResult> {
    const { conversationHistory } = params;

    if (conversationHistory.length < 2) {
      return {
        value: 0.5,
        dimensions: {
          clarity: 0.5,
          helpfulness: 0.5,
          professionalism: 0.5,
          efficiency: 0.5,
        },
        explanation: "Conversation too short for quality assessment",
      };
    }

    const prompt = buildQualityAnalysisPrompt(conversationHistory);

    const response = await this.callable.forward({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const { dimensions, explanation } = parseQualityResponse(response.data);
    const value = calculateOverallScore(dimensions);

    const scores = Object.entries(dimensions)
      .map(([k, v]) => `${k}: ${(v * 100).toFixed(0)}%`)
      .join(", ");

    return {
      value,
      dimensions,
      explanation: `Quality scores - ${scores}. ${explanation}`,
    };
  }
}

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type QualityDimensions = {
  clarity: number;
  helpfulness: number;
  professionalism: number;
  efficiency: number;
};

export type ConversationQualityResult = BaseScorerResult & {
  dimensions: QualityDimensions;
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
      return new ConversationQualityScorer({ callable });
    },
  });
}

export default createEntry;
