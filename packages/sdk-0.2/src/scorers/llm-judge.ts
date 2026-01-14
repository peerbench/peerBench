import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { parseResponseAsJSON } from "@/utils";
import { RateLimiter } from "@/utils/rate-limiter";
import { AbstractScorer, BaseScorerResult } from "./abstract";
import { PEERBENCH_NAMESPACE } from "@/constants";
import z from "zod";

export class LLMAsAJudgeScorer extends AbstractScorer {
  override readonly kind = `${PEERBENCH_NAMESPACE}/llm-as-a-judge` as const;

  private provider: AbstractLLMProvider;

  constructor(config: {
    provider: AbstractLLMProvider;
    rateLimiter?: RateLimiter;
  }) {
    super();
    this.provider = config.provider;
  }

  override async score<T extends z.ZodRawShape>(
    params: LLMAsAJudgeScoreParams & { fieldsToExtract: T }
  ): Promise<ScorerResultWithExtractedFields<T> | null>;
  override async score(
    params: LLMAsAJudgeScoreParams & { fieldsToExtract?: never }
  ): Promise<ScorerResultWithoutExtractedFields | null>;
  override async score<T extends z.ZodRawShape>(
    params: LLMAsAJudgeScoreParams & { fieldsToExtract?: T }
  ): Promise<
    | ScorerResultWithoutExtractedFields
    | ScorerResultWithExtractedFields<T>
    | null
  > {
    const criteria = normalizeWeights(params.criteria);
    const systemPrompt = [];
    const responseSchema = z.object({
      results: z
        .array(
          z.object({
            id: z.string().describe("The id of the criterion"),
            score: z.number().describe("The score of the criterion"),
            explanation: z
              .string()
              .describe("The explanation of the criterion"),
          })
        )
        .describe("The results of the evaluation per criterion"),

      explanation: z
        .string()
        .describe(
          `The overall explanation for the score (less than ${params.maxExplanationLength ?? 200} characters)`
        ),

      ...(params.fieldsToExtract ?? {}),
    });

    systemPrompt.push("You are a strict, fair evaluation judge.");

    if (params.systemPrompt) {
      systemPrompt.push(params.systemPrompt);
    } else {
      systemPrompt.push("Only use information from the rubric");
    }

    systemPrompt.push(
      "For each criterion return an integer score within the provided scale and a very brief justification (less than 2 sentences)."
    );
    systemPrompt.push(
      [
        `Rubric: ${params.rubric}`,
        `Criteria:`,
        ...criteria.map(
          (criterion) =>
            `- ${criterion.id}: ${criterion.description} (weight: ${criterion.weight}, scale: ${criterion.scale?.min ?? 0}..${criterion.scale?.max ?? 5})`
        ),
      ].join("\n")
    );

    const responseJSONSchema = responseSchema.toJSONSchema();
    systemPrompt.push(
      `Reply back with the following JSON schema (strict):\n${JSON.stringify(responseJSONSchema, null, 2)}\n`
    );

    const userPrompt = [`Answer: ${params.response}`];
    const providerResponse = await this.provider.forward({
      messages: [
        {
          role: "system",
          content: systemPrompt.join("\n"),
        },
        {
          role: "user",
          content: userPrompt.join("\n"),
        },
      ],
      model: params.model,
      responseFormat: {
        type: "json_schema",
        json_schema: {
          name: "judgeResult",
          schema: responseJSONSchema,
        },
      },
    });

    const parsed = responseSchema.parse(
      parseResponseAsJSON(providerResponse.data)
    );

    const { explanation, results, ...extractedFields } = parsed;

    return {
      explanation,
      results,
      value: computeOverallScore(results, criteria),
      extractedFields: extractedFields as z.infer<z.ZodObject<T>>,

      provider: this.provider.kind,
      inputTokensUsed: providerResponse.inputTokensUsed,
      outputTokensUsed: providerResponse.outputTokensUsed,
      inputCost: providerResponse.inputCost,
      outputCost: providerResponse.outputCost,
    };
  }
}

export type LLMAsAJudgeCriterion = {
  id: string;
  description: string;
  weight: number;
  scale?: {
    min: number;
    max: number;
  };
};

export type LLMAsAJudgeScoreParams = {
  model: string;
  response: string;
  rubric: string;
  criteria: LLMAsAJudgeCriterion[];

  systemPrompt?: string;
  maxExplanationLength?: number;
};

type ScorerResultWithoutExtractedFields = BaseScorerResult & {
  results: {
    id: string;
    score: number;
    explanation: string;
  }[];

  provider: string;
  inputTokensUsed?: number;
  outputTokensUsed?: number;
  inputCost?: string;
  outputCost?: string;
};

type ScorerResultWithExtractedFields<T extends z.ZodRawShape> =
  ScorerResultWithoutExtractedFields & {
    extractedFields: z.infer<z.ZodObject<T>>;
  };

function normalizeWeights(
  criteria: LLMAsAJudgeCriterion[]
): LLMAsAJudgeCriterion[] {
  const sum = criteria.reduce((a, c) => a + (c.weight ?? 1), 0) || 1;
  return criteria.map((c) => ({ ...c, weight: (c.weight ?? 1) / sum }));
}

function computeOverallScore(
  results: ScorerResultWithoutExtractedFields["results"],
  criteria: LLMAsAJudgeCriterion[]
): number {
  let total = 0;
  for (const pc of results) {
    const criterion = criteria.find((c) => c.id === pc.id);
    const min = criterion?.scale?.min ?? 0;
    const max = criterion?.scale?.max ?? 5;
    const weight = criterion?.weight ?? 0;

    const score = Number(pc.score);
    if (!Number.isFinite(score)) continue;

    const clamped = Math.max(min, Math.min(max, score));
    const normalized01 = max === min ? 0 : (clamped - min) / (max - min);
    total += normalized01 * weight;
  }
  return Math.max(0, Math.min(1, total));
}
