import { AbstractScorer, type BaseScorerResult } from "peerbench/scorers";
import type { CallableLLM } from "peerbench/providers";
import { PEERBENCH_NAMESPACE } from "peerbench";
import { defineScorerEntry, type ProviderEntry } from "@peerbench/core";
import meta from "./meta";

function buildRegressionCheckPrompt(
  conversationHistory: ConversationMessage[],
  knownIssues: KnownIssue[]
): string {
  const formatted = conversationHistory
    .map((m, i) => {
      const turn = Math.floor(i / 2) + 1;
      const role = m.role === "user" ? "Customer" : "Agent";
      return `Turn ${turn} - ${role}: ${m.content}`;
    })
    .join("\n\n");

  const issuesList = knownIssues
    .map((issue, i) => {
      const severity = issue.severity ? ` [${issue.severity}]` : "";
      const category = issue.category ? ` (${issue.category})` : "";
      return `[ISSUE_${i}] ${issue.description}${severity}${category}`;
    })
    .join("\n");

  return `Analyze this conversation to check if any of the known issues from previous conversations have recurred.

## Known Issues from Previous Conversations
These are problems that occurred in earlier versions of this agent. Check if any of them appear in this new conversation:
${issuesList}

## Current Conversation
${formatted}

## Instructions
1. For each known issue, determine if it appears in the current conversation
2. If an issue appears, note which turn it occurred in and what content matched
3. Also note which issues did NOT recur (were fixed)
4. Assess your confidence level for each match

## Response Format
Respond in JSON format:
{
  "regressions": [
    {
      "issueIndex": <number>,
      "matchedTurn": <turn number where issue appeared>,
      "matchedContent": "<relevant quote from conversation>",
      "confidence": "<high, medium, or low>"
    }
  ],
  "fixedIssues": [<list of issue indices that did NOT recur>],
  "explanation": "<brief summary of regression analysis>"
}

If no regressions were found, return an empty array for regressions and list all issue indices in fixedIssues.

JSON Response:`;
}

function parseRegressionResponse(
  response: string,
  knownIssues: KnownIssue[]
): {
  regressions: RegressionMatch[];
  fixedIssues: string[];
  explanation: string;
} {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      const regressions: RegressionMatch[] = (parsed.regressions || [])
        .map((r: any) => {
          const issueIndex = r.issueIndex;
          if (issueIndex >= 0 && issueIndex < knownIssues.length) {
            const issue = knownIssues[issueIndex];
            if (issue) {
              return {
                issueId: issue.id,
                issueDescription: issue.description,
                matchedTurn: r.matchedTurn,
                matchedContent: r.matchedContent,
                confidence: r.confidence as "high" | "medium" | "low",
              };
            }
          }
          return null;
        })
        .filter(
          (x: RegressionMatch | null): x is RegressionMatch => x !== null
        );

      const fixedIssues: string[] = (parsed.fixedIssues || [])
        .map((idx: number) => {
          if (idx >= 0 && idx < knownIssues.length) {
            const issue = knownIssues[idx];
            return issue ? issue.id : null;
          }
          return null;
        })
        .filter((x: string | null): x is string => x !== null);

      return {
        regressions,
        fixedIssues,
        explanation: parsed.explanation || "Analysis complete",
      };
    }
  } catch {
    // Parsing failed
  }

  return {
    regressions: [],
    fixedIssues: [],
    explanation: "Unable to parse regression analysis response",
  };
}

function calculateScore(
  regressions: RegressionMatch[],
  knownIssues: KnownIssue[]
): number {
  if (regressions.length === 0) return 1.0;

  const severityPenalties: Record<string, number> = {
    minor: 0.1,
    moderate: 0.2,
    severe: 0.35,
  };

  const confidenceMultipliers: Record<string, number> = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
  };

  let totalPenalty = 0;
  for (const regression of regressions) {
    const issue = knownIssues.find((i) => i.id === regression.issueId);
    const severity = issue?.severity || "moderate";
    const basePenalty = severityPenalties[severity] || 0.2;
    const confidence = confidenceMultipliers[regression.confidence] || 0.7;
    totalPenalty += basePenalty * confidence;
  }

  return Math.max(0, 1.0 - totalPenalty);
}

export class RegressionCheckerScorer extends AbstractScorer.withKind(
  `${PEERBENCH_NAMESPACE}/regression-checker.scorer`
) {
  private callable: CallableLLM;

  constructor(config: { callable: CallableLLM }) {
    super();
    this.callable = config.callable;
  }

  async score(params: {
    conversationHistory: ConversationMessage[];
    knownIssues: KnownIssue[];
  }): Promise<RegressionCheckerResult> {
    const { conversationHistory, knownIssues } = params;

    if (!knownIssues || knownIssues.length === 0) {
      return {
        value: 1.0,
        regressions: [],
        fixedIssues: [],
        explanation: "No known issues to check against",
      };
    }

    if (conversationHistory.length < 2) {
      return {
        value: 1.0,
        regressions: [],
        fixedIssues: knownIssues.map((i) => i.id),
        explanation: "Conversation too short to assess regressions",
      };
    }

    const prompt = buildRegressionCheckPrompt(conversationHistory, knownIssues);

    const response = await this.callable.forward({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
    });

    const { regressions, fixedIssues, explanation } = parseRegressionResponse(
      response.data,
      knownIssues
    );
    const value = calculateScore(regressions, knownIssues);

    const regressedCount = regressions.length;
    const fixedCount = fixedIssues.length;
    const totalIssues = knownIssues.length;

    return {
      value,
      regressions,
      fixedIssues,
      explanation:
        regressions.length === 0
          ? `No regressions detected. ${fixedCount}/${totalIssues} previously known issues appear to be fixed.`
          : `Found ${regressedCount} regression(s) out of ${totalIssues} known issues. ${fixedCount} issues appear fixed. ${explanation}`,
    };
  }
}

export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

export type KnownIssue = {
  id: string;
  description: string;
  category?: string;
  severity?: "minor" | "moderate" | "severe";
  originalTurn?: number;
};

export type RegressionMatch = {
  issueId: string;
  issueDescription: string;
  matchedTurn: number;
  matchedContent: string;
  confidence: "high" | "medium" | "low";
};

export type RegressionCheckerResult = BaseScorerResult & {
  regressions: RegressionMatch[];
  fixedIssues: string[];
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
      return new RegressionCheckerScorer({ callable });
    },
  });
}

export default createEntry;
