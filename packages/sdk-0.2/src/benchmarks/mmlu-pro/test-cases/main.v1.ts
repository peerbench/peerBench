import {
  BaseTestCaseSchemaV1,
  defineTestCaseSchema,
} from "@/schemas/test-case";
import { BaseMMLUProScoreSchemaV1 } from "../score";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { defineResponseSchema, defineScoreSchema } from "@/schemas";
import { z } from "zod";

// Test case schema
export const MMLUProMainTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  kind: "mmlu-pro.ts.main",
  schemaVersion: 1,
  fields: {
    question: z.string(),
    options: z.record(z.string(), z.string()),
    answer: z.string(),
    answerKey: z.string(),
  },
});
export type MMLUProMainTestCaseV1 = z.infer<typeof MMLUProMainTestCaseSchemaV1>;

// Response schema
export const MMLUProMainResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "mmlu-pro.rs.main",
  schemaVersion: 1,
});
export type MMLUProMainResponseV1 = z.infer<typeof MMLUProMainResponseSchemaV1>;

// Score schema
export const MMLUProMainScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseMMLUProScoreSchemaV1,
  kind: "mmlu-pro.sc.main",
  schemaVersion: 1,
  fields: {
    extractedAnswers: z.array(z.string()),
  },
});
export type MMLUProMainScoreV1 = z.infer<typeof MMLUProMainScoreSchemaV1>;
