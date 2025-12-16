import { z } from "zod";
import { AbstractScorer } from "./abstract/abstract-scorer";
import {
  PromptResponse,
  PromptResponseSchema,
  PromptScore,
  PromptScoreSchema,
  PromptTypes,
  ScoringMethods,
} from "@/types";
import { BaseLLMProvider, OpenRouterProvider } from "@/providers";
import { debugLog } from "@/utils/debug";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { v7 as uuidv7 } from "uuid";
import { RateLimiter } from "@/utils";

/**
 * LLM Judge Scorer that supports both pointwise and pairwise evaluation modes
 */
export class LLMJudgeScorer extends AbstractScorer {
  readonly identifier = "llm-judge";

  optionsSchema = z
    .object({
      openRouterApiKey: z.string().optional(),
      provider: z.instanceof(BaseLLMProvider).optional(),
      rateLimiter: z.instanceof(RateLimiter).optional(),
      model: z.string().default("openai/gpt-4o-mini"),
      mode: z.enum(["pointwise", "pairwise"]).default("pointwise"),
      criteria: z.array(CriterionSchema).min(1),
      meta: z.record(z.any(), z.any()).optional(),
      temperature: z.number().min(0).max(2).default(0.0),
      promptPrefix: z.string().default(""),
      promptSuffix: z.string().default(""),
      responseB: PromptResponseSchema.optional(),
    })
    .transform((options, ctx) => {
      if (options.provider !== undefined) {
        return options;
      }

      if (options.openRouterApiKey !== undefined) {
        return {
          ...options,
          provider: new OpenRouterProvider({
            apiKey: options.openRouterApiKey,
          }),
        };
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No provider or openRouterApiKey provided",
      });

      return z.NEVER;
    });

  async scoreOne(
    response: PromptResponse,
    options: z.input<typeof this.optionsSchema>
  ) {
    if (!(await this.canScore(response, options))) {
      return undefined;
    }

    const parsedOptions = this.optionsSchema.parse(options);
    const provider =
      parsedOptions.provider ??
      new OpenRouterProvider({
        apiKey: parsedOptions.openRouterApiKey!,
      });

    if (parsedOptions.mode === "pointwise") {
      return this.scorePointwise(response, parsedOptions, provider);
    } else {
      // For pairwise mode, we need a second Response to compare against
      if (!parsedOptions.responseB) {
        throw new Error(
          "Pairwise mode requires responseB to be provided in options."
        );
      }
      return this.scorePairwise(response, parsedOptions, provider);
    }
  }

  private systemPrompt() {
    return [
      "You are a strict, fair evaluation judge.",
      "Only use information provided in the task and candidate answers.",
      "For each criterion, return an integer score within the provided scale and a very brief justification (≤2 sentences).",
      "Return only JSON that conforms to the requested schema.",
      "Do not include chain-of-thought or internal reasoning; just concise justifications.",
    ].join(" ");
  }

  private async scorePointwise(
    response: PromptResponse,
    options: z.infer<typeof this.optionsSchema>,
    provider: BaseLLMProvider
  ): Promise<PromptScore | undefined> {
    let task = response.prompt.fullPrompt;

    if (response.prompt.type === PromptTypes.MultipleChoice) {
      task += `\nCorrect answer: ${response.prompt.answerKey} - ${response.prompt.answer}`;
    } else if (response.prompt.answer) {
      task += `\nExpected answer: ${response.prompt.answer}`;
    }

    const norm = this.normalizeWeights(options.criteria);
    const user = [
      `TASK:\n${task}`,
      options.meta
        ? `\nADDITIONAL CONTEXT (may include references, constraints, expected behavior):\n${JSON.stringify(options.meta, null, 2)}`
        : "",
      `\nRUBRIC:\n${this.renderCriteria(norm)}`,
      `\nCANDIDATE ANSWER:\n${response.response!}`,
      `\nRESPONSE FORMAT (strict JSON):`,
      JSON.stringify(
        {
          perCriterion: [
            {
              id: "<string>",
              score: "<integer within scale>",
              justification: "<≤2 sentences>",
            },
          ],
          overall: "<0..100 integer>",
          verdict: "<one of: 'strong-pass' | 'pass' | 'borderline' | 'fail'>",
          notes: "<optional, ≤3 short bullet points>",
        },
        null,
        2
      ),
    ].join("");

    const scorePrompt = [
      user,
      "\nINSTRUCTIONS:",
      "- Compute per-criterion integer scores within each scale.",
      "- Compute weighted overall as a 0-100 integer: normalize weights, map each score to 0-100 by its scale, then weighted average.",
      "- Choose verdict thresholds: ≥85 strong-pass, 70-84 pass, 60-69 borderline, <60 fail.",
      "- Output valid JSON only.",
    ].join("\n");
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: this.systemPrompt() },
      {
        role: "user",
        content: scorePrompt,
      },
    ];

    const llmResponse = await provider.forward(messages, {
      rateLimiter: options.rateLimiter,
      model: options.model,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "pointwise_result",
          schema: {
            type: "object",
            properties: {
              perCriterion: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    score: { type: "number" },
                    justification: { type: "string" },
                  },
                  required: ["id", "score", "justification"],
                },
              },
              overall: { type: "number" },
              verdict: { type: "string" },
              notes: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["perCriterion", "overall", "verdict", "notes"],
          },
        },
      },
    });

    debugLog("LLM Response:", llmResponse.data!);

    const json = extractFirstJSON<PointwiseResult>(llmResponse.data!);
    if (!Array.isArray(json.perCriterion)) {
      throw new Error("Model did not return perCriterion array.");
    }
    debugLog("Extracted JSON from Judge response:", json);

    // Compute overall score if not provided or invalid
    const computedOverall = this.computeOverallScore(json.perCriterion, norm);
    const overall =
      Number.isFinite(Number(json.overall)) && Number(json.overall) > 0
        ? Number(json.overall)
        : computedOverall;

    // Convert overall score (0-100) to 0-1 scale for PromptScore
    const score = Math.min(1, Math.max(0, overall / 100));
    let explanation = "";

    if (json.notes && json.notes.length > 0) {
      explanation = Array.isArray(json.notes)
        ? json.notes.join(" ")
        : json.notes;
    }

    for (const criterion of json.perCriterion) {
      explanation += [
        `\nCriteria: ${criterion.id}`,
        `Score: ${criterion.score}`,
        `Justification:\n${criterion.justification}\n`,
      ].join("\n");
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      prompt: response.prompt,
      method: ScoringMethods.ai,
      scorerAIProvider: provider.getIdentifier(),
      scorerAIModelSlug: options.model,
      scorerAIInputTokensUsed: llmResponse.inputTokensUsed,
      scorerAIOutputTokensUsed: llmResponse.outputTokensUsed,
      scorerAIInputCost: llmResponse.inputCost,
      scorerAIOutputCost: llmResponse.outputCost,
      scoreMetadata: {
        overall,
        scorerIdentifier: this.identifier,
        mode: "pointwise",
        perCriterion: json.perCriterion,
        verdict: json.verdict,
        scorePrompt,
        systemPrompt: this.systemPrompt(),
      },
      explanation: explanation || undefined,
    });
  }

  private async scorePairwise(
    response: PromptResponse,
    options: z.infer<typeof this.optionsSchema>,
    provider: BaseLLMProvider
  ): Promise<PromptScore | undefined> {
    if (
      !options.responseB ||
      !response.response ||
      !options.responseB.response
    ) {
      return undefined;
    }

    const norm = this.normalizeWeights(options.criteria);
    const user = [
      `TASK:\n${response.prompt.fullPrompt}`,
      options.meta
        ? `\nADDITIONAL CONTEXT:\n${JSON.stringify(options.meta, null, 2)}`
        : "",
      `\nRUBRIC:\n${this.renderCriteria(norm)}`,
      `\nCANDIDATE A:\n${response.response}`,
      `\nCANDIDATE B:\n${options.responseB.response}`,
      `\nRESPONSE FORMAT (strict JSON):`,
      JSON.stringify(
        {
          winner: "<'A' | 'B' | 'tie'>",
          confidence: "<integer 1..5>",
          rationale: "<≤3 sentences>",
          perCriterion: [
            {
              id: "<string>",
              better: "<'A'|'B'|'tie'>",
              justification: "<≤2 sentences>",
            },
          ],
        },
        null,
        2
      ),
    ].join("");

    const systemPrompt = [
      this.systemPrompt(),
      "When comparing, do not reward verbosity or length. Prefer factual accuracy, adherence to instructions, safety, and clarity.",
    ].join(" ");
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: user },
    ];

    const content = await provider.forward(messages, {
      rateLimiter: options.rateLimiter,
      model: options.model,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "pairwise_result",
          schema: {
            type: "object",
            properties: {
              winner: { type: "string" },
              confidence: { type: "number" },
              rationale: { type: "string" },
              perCriterion: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    better: { type: "string" },
                    justification: { type: "string" },
                  },
                  required: ["id", "better", "justification"],
                },
              },
            },
            required: ["winner", "confidence", "rationale", "perCriterion"],
          },
        },
      },
    });
    const json = extractFirstJSON<PairwiseResult>(content.data!);

    debugLog("Original Pairwise Judge response:", content.data!);
    debugLog("Extracted JSON from Pairwise Judge response:", json);

    if (!json || !["A", "B", "tie"].includes(json.winner)) {
      throw new Error("Model returned invalid pairwise result.");
    }
    const confidence = Math.max(1, Math.min(5, Number(json.confidence) || 3));

    // Convert pairwise result to a score (0-1 scale)
    // If the other Response is better then the score
    // would be closer to 0.
    let score = 0.5; // default for tie
    if (json.winner === "A") {
      score = 1.0;
    } else if (json.winner === "B") {
      score = 0.0;
    }

    let explanation = "";

    if (json.rationale) {
      explanation = json.rationale;
    }

    for (const criterion of json.perCriterion) {
      explanation += [
        `Criteria: ${criterion.id}`,
        `Better: ${criterion.better}`,
        `Justification:\n${criterion.justification}\n`,
      ].join("\n");
    }

    return PromptScoreSchema.parse({
      ...response,
      score,
      scoreUUID: uuidv7(),
      prompt: response.prompt,
      method: ScoringMethods.ai,
      scorerAIProvider: provider.getIdentifier(),
      scorerAIModelSlug: options.model,
      scorerAIInputTokensUsed: content.inputTokensUsed,
      scorerAIOutputTokensUsed: content.outputTokensUsed,
      scorerAIInputCost: content.inputCost,
      scorerAIOutputCost: content.outputCost,
      scoreMetadata: {
        scorerIdentifier: this.identifier,
        mode: "pairwise",
        winner: json.winner,
        confidence,
        rationale: json.rationale,
        perCriterion: json.perCriterion,
        responseB: options.responseB.response,
        systemPrompt,
        scorePrompt: user,
      },
      explanation: explanation || undefined,
    });
  }

  /**
   * Build the pairwise evaluation prompt
   */
  private buildPairwisePrompt(
    task: string,
    answerA: string,
    answerB: string,
    criteria: z.infer<typeof CriterionSchema>[],
    meta?: Record<string, any>,
    prefix = "",
    suffix = ""
  ): string {
    const rubric = this.renderCriteria(criteria);

    const userPrompt = [
      `TASK:\n${task}`,
      meta ? `\nADDITIONAL CONTEXT:\n${JSON.stringify(meta, null, 2)}` : "",
      `\nRUBRIC:\n${rubric}`,
      `\nCANDIDATE A:\n${answerA}`,
      `\nCANDIDATE B:\n${answerB}`,
      `\nRESPONSE FORMAT (strict JSON):`,
      JSON.stringify(
        {
          winner: "<'A' | 'B' | 'tie'>",
          confidence: "<integer 1..5>",
          rationale: "<≤3 sentences>",
          perCriterion: [
            {
              id: "<string>",
              better: "<'A'|'B'|'tie'>",
              justification: "<≤2 sentences>",
            },
          ],
        },
        null,
        2
      ),
    ].join("\n");

    return `${prefix}${userPrompt}${suffix}`;
  }

  /**
   * Normalize criterion weights to sum to 1
   */
  private normalizeWeights(
    criteria: z.infer<typeof CriterionSchema>[]
  ): z.infer<typeof CriterionSchema>[] {
    const sum = criteria.reduce((a, c) => a + (c.weight ?? 1), 0) || 1;
    return criteria.map((c) => ({ ...c, weight: (c.weight ?? 1) / sum }));
  }

  /**
   * Render criteria as a formatted string
   */
  private renderCriteria(criteria: z.infer<typeof CriterionSchema>[]): string {
    return criteria
      .map((c, i) => {
        const mn = c.scale?.min ?? 0;
        const mx = c.scale?.max ?? 5;
        return `${i + 1}. id="${c.id}" (weight=${c.weight}, scale=${mn}..${mx}) — ${c.description}`;
      })
      .join("\n");
  }

  /**
   * Compute overall score from per-criterion scores
   */
  private computeOverallScore(
    perCriterion: Array<{ id: string; score: number; justification: string }>,
    criteria: z.infer<typeof CriterionSchema>[]
  ): number {
    let total = 0;
    for (const pc of perCriterion) {
      const criterion = criteria.find((c) => c.id === pc.id);
      const { min, max, weight } = {
        min: criterion?.scale?.min ?? 0,
        max: criterion?.scale?.max ?? 5,
        weight: criterion?.weight ?? 0,
      };

      const score = Number(pc.score);
      if (!Number.isFinite(score)) continue;

      const clamped = Math.max(min, Math.min(max, score));
      const normalized100 =
        max === min ? 0 : ((clamped - min) / (max - min)) * 100;
      total += normalized100 * weight;
    }
    return Math.round(total);
  }

  /**
   * Extract criteria IDs from prompt text (fallback)
   */
  private extractCriteria(promptText: string): string[] {
    const ids: string[] = [];
    const re = /\d+\. id="([^"]+)"/g;
    let m;
    while ((m = re.exec(promptText)) !== null) {
      ids.push(m[1]);
    }
    return ids.length
      ? ids
      : ["correctness", "instruction_following", "clarity"];
  }

  async canScore(
    response: PromptResponse,
    options?: Record<string, any>
  ): Promise<boolean> {
    const hasValidResponse =
      response.response !== undefined && response.prompt !== undefined;

    if (!hasValidResponse) {
      return false;
    }

    // For pairwise mode, we also need to check if responseB is provided
    if (options?.mode === "pairwise") {
      return (
        options.responseB !== undefined &&
        options.responseB.response !== undefined &&
        options.responseB.prompt !== undefined
      );
    }

    return true;
  }
}

/**
 * Extract first JSON object from a string, with fallback parsing
 */
function extractFirstJSON<T>(maybeJSON: string) {
  try {
    return JSON.parse(maybeJSON) as T;
  } catch {
    // Continue to fallback parsing
  }
  const start = maybeJSON.indexOf("{");
  const end = maybeJSON.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = maybeJSON.slice(start, end + 1);
    try {
      return JSON.parse(slice) as T;
    } catch {
      // Continue to error
    }
  }
  throw new Error("Failed to parse model response as JSON.");
}

/**
 * Criterion schema for LLM judge scoring
 */
const CriterionSchema = z.object({
  id: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(1).default(1),
  scale: z
    .object({
      min: z.number().default(0),
      max: z.number().default(5),
    })
    .default({ min: 0, max: 5 }),
});

/**
 * Pointwise scoring result schema
 */
type PointwiseResult = {
  perCriterion: Array<{
    id: string;
    score: number;
    justification: string;
  }>;
  overall: number;
  verdict: "strong-pass" | "pass" | "borderline" | "fail";
  notes?: string[];
};

/**
 * Pairwise scoring result schema
 */
type PairwiseResult = {
  winner: "A" | "B" | "tie";
  confidence: number;
  rationale: string;
  perCriterion: Array<{
    id: string;
    better: "A" | "B" | "tie";
    justification: string;
  }>;
};
