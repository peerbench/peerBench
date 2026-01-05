import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { FNOLBaseScoreSchemaV1 } from "../score";
import { FNOLDoneReason, FNOLFieldValueType } from "../types";

export const FNOLFieldSchemaV1 = z.object({
  description: z.string(),
  required: z.boolean().optional(),
  /**
   * Optional expected value used by the deterministic scorer.
   * If omitted, the scorer will only check presence.
   */
  expected: z.unknown().optional(),
  /**
   * Optional type hint for the model/user simulation.
   */
  valueType: z.enum(FNOLFieldValueType).optional(),
});

export const FNOLTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "fnol.ts.v1",
  schemaVersion: 1,
  fields: {
    /**
     * Scenario starter message. This is what the "user" would say initially.
     */
    initialUserMessage: z.string(),

    /**
     * Private/structured information about the user and the incident.
     * This is used by the user simulator LLM to answer the target model questions.
     */
    userProfile: z.record(z.string(), z.unknown()),

    /**
     * The fields the target model must collect.
     * Keys are canonical identifiers (e.g. "policyNumber", "dateOfLoss").
     */
    fieldsToCollect: z.record(z.string(), FNOLFieldSchemaV1),

    /**
     * Maximum number of back-and-forth turns (target question + user answer).
     */
    maxTurns: z.number().int().min(1).max(100).default(10),
  },
});
export type FNOLTestCaseV1 = z.infer<typeof FNOLTestCaseSchemaV1>;

export const FNOLConversationMessageSchemaV1 = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const FNOLResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "fnol.rs.v1",
  schemaVersion: 1,
  fields: {
    /**
     * Full conversation between the target model and simulated user.
     */
    conversation: z.array(FNOLConversationMessageSchemaV1),
    turnsUsed: z.number().int(),
    doneReason: z.enum(FNOLDoneReason),

    /**
     * Parsed JSON object from the target model's final answer, if available.
     */
    extracted: z.record(z.string(), z.unknown()).optional(),
  },
});
export type FNOLResponseV1 = z.infer<typeof FNOLResponseSchemaV1>;

export const FNOLFieldsScoreSchemaV1 = defineScoreSchema({
  baseSchema: FNOLBaseScoreSchemaV1,
  kind: "fnol.sc.fields.v1",
  schemaVersion: 1,
  fields: {
    requiredKeys: z.array(z.string()),
    presentKeys: z.array(z.string()),
    missingKeys: z.array(z.string()),
    mismatchedKeys: z.array(z.string()),
  },
});
export type FNOLFieldsScoreV1 = z.infer<typeof FNOLFieldsScoreSchemaV1>;

export const FNOLLLMJudgeScoreSchemaV1 = defineScoreSchema({
  baseSchema: FNOLBaseScoreSchemaV1,
  kind: "fnol.sc.llm-judge.v1",
  schemaVersion: 1,
  fields: {
    verdict: z.enum(["pass", "borderline", "fail"]).optional(),
  },
});
export type FNOLLLMJudgeScoreV1 = z.infer<typeof FNOLLLMJudgeScoreSchemaV1>;
