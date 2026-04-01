import { PEERBENCH_NAMESPACE } from "@/constants";
import {
  BaseResponseSchemaV1,
  BaseScoreSchemaV1,
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { ExtensionLLMResponseFieldsV1 } from "@/schemas/extensions/response/llm";
import { ExtensionLLMAsAJudgeScoreFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";
import { z } from "zod";

export const MultiTurnKind = `llm/multi-turn` as const;

export const MultiTurnTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MultiTurnKind,
  schemaVersion: 1,
  fields: {
    messages: z
      .object({
        role: z.string(),
        content: z.string(),
        goodAnswers: z.string().array().optional(),
        badAnswers: z.string().array().optional(),
      })
      .array(),

    maxTurns: z.number().optional(),
    expectedOutcome: z.string().optional(),
  },
});
export type MultiTurnTestCaseV1 = z.infer<typeof MultiTurnTestCaseSchemaV1>;

export const MultiTurnResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MultiTurnKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMResponseFieldsV1,
    replies: z
      .object({
        messageIndex: z.number(),
        startedAt: z.number(),
        completedAt: z.number(),
        data: z.string(),

        inputTokensUsed: z.number().optional(),
        outputTokensUsed: z.number().optional(),
        inputCost: z.string().optional(),
        outputCost: z.string().optional(),
      })
      .array(),
  },
});
export type MultiTurnResponseV1 = z.infer<typeof MultiTurnResponseSchemaV1>;

export const MultiTurnScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: MultiTurnKind,
  schemaVersion: 1,
  fields: {
    ...ExtensionLLMAsAJudgeScoreFieldsV1,
    individualScores: z
      .object({
        replyIndex: z.number(),
        value: z.number(),
      })
      .array(),
  },
});
export type MultiTurnScoreV1 = z.infer<typeof MultiTurnScoreSchemaV1>;
