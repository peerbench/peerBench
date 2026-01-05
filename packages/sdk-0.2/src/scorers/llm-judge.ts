import { AbstractLLMProvider } from "@/providers/abstract/llm";
import { parseResponseAsJSON } from "@/utils";
import { RateLimiter } from "@/utils/rate-limiter";
import { ChatCompletionMessageParam } from "openai/resources/index";
import { AbstractScorer, BaseScorerResult } from "./abstract";

export class LLMJudgeScorer extends AbstractScorer {
  override readonly kind = "llmJudge";

  private provider: AbstractLLMProvider;

  constructor(provider: AbstractLLMProvider) {
    super();
    this.provider = provider;
  }

  override async score(
    params: LLMJudgeScorerParams
  ): Promise<LLMJudgeScorerResult | null> {
    const criteria = normalizeWeights(params.criteria ?? DEFAULT_CRITERIA);
    const systemPrompt =
      params.systemPrompt ??
      [
        "You are a strict, fair evaluation judge.",
        "Only use information provided in the task, reference, and candidate answer(s).",
        "For each criterion, return an integer score within the provided scale and a very brief justification (≤2 sentences).",
        "Return only JSON that conforms to the requested schema.",
        "Do not include chain-of-thought or internal reasoning; only concise justifications.",
      ].join(" ");

    const promptPrefix = params.promptPrefix ?? "";
    const promptSuffix = params.promptSuffix ?? "";

    return await scorePointwise(
      {
        task: params.task,
        referenceAnswer: params.referenceAnswer,
        candidateAnswer: params.candidateAnswer,
        criteria,
        meta: params.meta,
        model: params.model,
        rateLimiter: params.rateLimiter,
        systemPrompt,
        promptPrefix,
        promptSuffix,
      },
      this.provider
    );
  }
}

export type LLMJudgeCriterion = {
  id: string;
  description: string;
  weight?: number;
  scale?: {
    min: number;
    max: number;
  };
};

export type LLMJudgeScorerResult = BaseScorerResult & {
  provider: string;
  inputTokensUsed?: number;
  outputTokensUsed?: number;
  inputCost?: string;
  outputCost?: string;
  verdict?: "pass" | "borderline" | "fail";
};

export type LLMJudgeScorerParams = {
  task: string;
  candidateAnswer: string;
  referenceAnswer?: string;

  model: string;

  /**
   * The rubric used for judging (defaults to a generic set).
   */
  criteria?: LLMJudgeCriterion[];

  /**
   * Optional extra context that the judge can use (constraints, references, etc.).
   */
  meta?: Record<string, unknown>;

  /**
   * Optional rate limiter wrapper for provider calls.
   */
  rateLimiter?: RateLimiter;

  /**
   * Optional prompt tweaks.
   */
  systemPrompt?: string;
  promptPrefix?: string;
  promptSuffix?: string;
};

type PointwiseResult = {
  perCriterion: Array<{ id: string; score: number; justification: string }>;
  overall?: number;
  verdict?: "strong-pass" | "pass" | "borderline" | "fail";
  notes?: string[] | string;
};

const DEFAULT_CRITERIA: LLMJudgeCriterion[] = [
  {
    id: "correctness",
    description: "Factual correctness and alignment with the task/reference.",
    weight: 0.5,
    scale: { min: 0, max: 5 },
  },
  {
    id: "instruction_following",
    description: "Adheres to constraints, format, and intent of the task.",
    weight: 0.3,
    scale: { min: 0, max: 5 },
  },
  {
    id: "clarity",
    description: "Clear, concise, and well-structured.",
    weight: 0.2,
    scale: { min: 0, max: 5 },
  },
];

// Standalone functions extracted from LLMJudgeScorer1 class
async function executeProviderCall<T>(
  call: () => Promise<T>,
  rateLimiter?: RateLimiter
): Promise<T> {
  if (!rateLimiter) {
    return await call();
  }
  return await rateLimiter.execute(call);
}

function normalizeWeights(criteria: LLMJudgeCriterion[]): LLMJudgeCriterion[] {
  const sum = criteria.reduce((a, c) => a + (c.weight ?? 1), 0) || 1;
  return criteria.map((c) => ({ ...c, weight: (c.weight ?? 1) / sum }));
}

function renderCriteria(criteria: LLMJudgeCriterion[]): string {
  return criteria
    .map((c, i) => {
      const min = c.scale?.min ?? 0;
      const max = c.scale?.max ?? 5;
      const weight = c.weight ?? 0;
      return `${i + 1}. id="${c.id}" (weight=${weight}, scale=${min}..${max}) — ${c.description}`;
    })
    .join("\n");
}

function computeOverallScore(
  perCriterion: Array<{ id: string; score: number; justification: string }>,
  criteria: LLMJudgeCriterion[]
): number {
  let total = 0;
  for (const pc of perCriterion) {
    const criterion = criteria.find((c) => c.id === pc.id);
    const min = criterion?.scale?.min ?? 0;
    const max = criterion?.scale?.max ?? 5;
    const weight = criterion?.weight ?? 0;

    const score = Number(pc.score);
    if (!Number.isFinite(score)) continue;

    const clamped = Math.max(min, Math.min(max, score));
    const normalized100 =
      max === min ? 0 : ((clamped - min) / (max - min)) * 100;
    total += normalized100 * weight;
  }
  return Math.round(total);
}

function deriveVerdict(
  overall: number
): "strong-pass" | "pass" | "borderline" | "fail" {
  if (overall >= 85) return "strong-pass";
  if (overall >= 70) return "pass";
  if (overall >= 60) return "borderline";
  return "fail";
}

function mapVerdict(
  verdict: "strong-pass" | "pass" | "borderline" | "fail"
): "pass" | "borderline" | "fail" {
  if (verdict === "borderline") return "borderline";
  if (verdict === "fail") return "fail";
  return "pass";
}

function buildPointwiseExplanation(json: PointwiseResult): string | undefined {
  let explanation = "";
  if (json.notes && Array.isArray(json.notes)) {
    explanation += json.notes.join(" ");
  } else if (typeof json.notes === "string") {
    explanation += json.notes;
  }

  for (const criterion of json.perCriterion ?? []) {
    explanation += [
      `\nCriteria: ${criterion.id}`,
      `Score: ${criterion.score}`,
      `Justification: ${criterion.justification}`,
    ].join("\n");
  }

  return explanation.trim() ? explanation.trim() : undefined;
}

function extractFirstJSON<T>(text: string): T | undefined {
  const jsonText = extractFirstJSONObjectString(text);
  if (!jsonText) return;
  return parseResponseAsJSON<T>(jsonText);
}

async function scorePointwise(
  args: {
    task: string;
    referenceAnswer?: string;
    candidateAnswer: string;
    criteria: LLMJudgeCriterion[];
    meta?: Record<string, unknown>;
    model: string;
    rateLimiter?: RateLimiter;
    systemPrompt: string;
    promptPrefix: string;
    promptSuffix: string;
  },
  provider: AbstractLLMProvider
): Promise<LLMJudgeScorerResult | null> {
  const user = [
    args.promptPrefix ? `${args.promptPrefix}\n` : "",
    `TASK:\n${args.task}`,
    args.meta
      ? `\n\nADDITIONAL CONTEXT:\n${JSON.stringify(args.meta, null, 2)}`
      : "",
    `\n\nRUBRIC:\n${renderCriteria(args.criteria)}`,
    args.referenceAnswer
      ? `\n\nREFERENCE ANSWER:\n${args.referenceAnswer}`
      : "\n\nREFERENCE ANSWER:\n<!NO REFERENCE PROVIDED!> (Judge based on task/context/rubric.)",
    `\n\nCANDIDATE ANSWER:\n${args.candidateAnswer}`,
    `\n\nRESPONSE FORMAT (strict JSON):`,
    JSON.stringify(
      {
        perCriterion: [
          {
            id: "<string>",
            score: "<integer within scale>",
            justification: "<≤2 sentences>",
          },
        ],
        overall: "<integer 0-100>",
        verdict: "<strong-pass|pass|borderline|fail>",
        notes: "<optional list of short strings>",
      },
      null,
      2
    ),
    "\n\nINSTRUCTIONS:",
    "- Compute per-criterion integer scores within each scale.",
    "- Compute weighted overall as a 0-100 integer: normalize weights, map each score to 0-100 by its scale, then weighted average.",
    "- Use verdict thresholds: ≥85 strong-pass, 70-84 pass, 60-69 borderline, <60 fail.",
    "- Output valid JSON only.",
    args.promptSuffix ? `\n${args.promptSuffix}` : "",
  ].join("");

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: args.systemPrompt },
    { role: "user", content: user },
  ];

  const providerResponse = await executeProviderCall(
    () =>
      provider.forward({
        model: args.model,
        messages,
      }),
    args.rateLimiter
  );

  const json = extractFirstJSON<PointwiseResult>(providerResponse.data);
  if (!json || !Array.isArray(json.perCriterion)) {
    return null;
  }

  const computedOverall = computeOverallScore(json.perCriterion, args.criteria);
  const overall =
    Number.isFinite(Number(json.overall)) && Number(json.overall) > 0
      ? Math.round(Number(json.overall))
      : computedOverall;

  const verdict = json.verdict ?? deriveVerdict(overall);

  const value = Math.min(1, Math.max(0, overall / 100));
  const explanation = buildPointwiseExplanation(json);

  return {
    value,
    verdict: mapVerdict(verdict),
    explanation,
    provider: provider.kind,
    inputTokensUsed: providerResponse.inputTokensUsed,
    outputTokensUsed: providerResponse.outputTokensUsed,
    inputCost: providerResponse.inputCost,
    outputCost: providerResponse.outputCost,
    metadata: {
      overall,
      verdict,
      perCriterion: json.perCriterion,
      notes: json.notes,
      scorePrompt: user,
      systemPrompt: args.systemPrompt,
    },
  };
}

function extractFirstJSONObjectString(text: string): string | undefined {
  const start = text.indexOf("{");
  if (start === -1) return;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      return text.slice(start, i + 1);
    }
  }
}
