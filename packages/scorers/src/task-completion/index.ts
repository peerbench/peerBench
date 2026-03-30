import { AbstractScorer, type BaseScorerResult } from "peerbench/scorers";
import type { CallableLLM } from "peerbench/providers";
import { PEERBENCH_NAMESPACE } from "peerbench";
import { defineScorerEntry, type ProviderEntry } from "@peerbench/core";
import meta from "./meta";

function buildTaskCompletionPrompt(
  conversationHistory: ConversationMessage[],
  expectedOutcome?: string,
  scenario?: string
): string {
  const formatted = conversationHistory
    .map((m, i) => {
      const turn = Math.floor(i / 2) + 1;
      const role = m.role === "user" ? "Customer" : "Agent";
      return `Turn ${turn} - ${role}: ${m.content}`;
    })
    .join("\n\n");

  const contextSection =
    scenario || expectedOutcome
      ? `## Context
${scenario ? `Scenario: ${scenario}` : ""}
${expectedOutcome ? `Expected Outcome: ${expectedOutcome}` : ""}`
      : "";

  return `Analyze this conversation to determine if the intended task was successfully completed.

${contextSection}

## Conversation
${formatted}

## Instructions
Evaluate whether:
1. The conversation reached a satisfactory conclusion
2. The customer's needs were addressed
3. Any required actions were taken or confirmed
4. The interaction ended appropriately (not abandoned mid-task)

Consider common task completion indicators:
- Confirmation of completed actions
- Summary of what was done
- Clear next steps provided
- Proper closing of the conversation
- Customer acknowledgment of resolution

## Response Format
Respond in JSON format:
{
  "completed": <true or false>,
  "completionLevel": <0.0 to 1.0 - how complete was the task>,
  "blockers": ["<list of things that prevented full completion, if any>"],
  "explanation": "<brief explanation of the assessment>"
}

JSON Response:`;
}

function parseTaskCompletionResponse(response: string): {
  completed: boolean;
  completionLevel: number;
  blockers: string[];
  explanation: string;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        completed: parsed.completed ?? false,
        completionLevel:
          parsed.completionLevel ?? (parsed.completed ? 1.0 : 0.0),
        blockers: parsed.blockers || [],
        explanation: parsed.explanation || "Analysis complete",
      };
    }
  } catch {
    // Parsing failed
  }

  return {
    completed: false,
    completionLevel: 0.5,
    blockers: ["Unable to parse analysis response"],
    explanation: "Unable to parse task completion analysis",
  };
}

export class TaskCompletionScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/task-completion.scorer`
) {
  private callable: CallableLLM;

  constructor(config: { callable: CallableLLM }) {
    super();
    this.callable = config.callable;
  }

  async score(params: {
    conversationHistory: ConversationMessage[];
    expectedOutcome?: string;
    scenario?: string;
  }): Promise<TaskCompletionResult> {
    const { conversationHistory, expectedOutcome, scenario } = params;

    if (conversationHistory.length < 2) {
      return {
        value: 0.0,
        completed: false,
        blockers: ["Conversation too short"],
        explanation: "Conversation too short to assess task completion",
      };
    }

    const prompt = buildTaskCompletionPrompt(
      conversationHistory,
      expectedOutcome,
      scenario
    );

    const response = await this.callable.forward({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const { completed, completionLevel, blockers, explanation } =
      parseTaskCompletionResponse(response.data);

    return {
      value: completionLevel,
      completed,
      blockers,
      explanation: completed
        ? `Task completed successfully. ${explanation}`
        : `Task not fully completed. Blockers: ${blockers.join(", ")}. ${explanation}`,
    };
  }
}

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type TaskCompletionResult = BaseScorerResult & {
  completed: boolean;
  blockers: string[];
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
      return new TaskCompletionScorer({ callable });
    },
  });
}

export default createEntry;
