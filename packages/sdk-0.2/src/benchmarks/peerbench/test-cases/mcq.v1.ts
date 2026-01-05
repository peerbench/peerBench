import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
} from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import { PeerbenchBaseScoreSchemaV1 } from "../score";

// Test case schema
export const PeerbenchMultipleChoiceTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,

  kind: "pb.ts.mcq",
  schemaVersion: 1,
  fields: {
    question: z.string(),
    options: z.record(z.string(), z.string()),
    answer: z.string(),
    answerKey: z.string(),
  },
});
export type PeerbenchMultipleChoiceTestCaseV1 = z.infer<
  typeof PeerbenchMultipleChoiceTestCaseSchemaV1
>;

// Response schema
export const PeerbenchMultipleChoiceResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "pb.rs.mcq",
  schemaVersion: 1,
  fields: {},
});
export type PeerbenchMultipleChoiceResponseV1 = z.infer<
  typeof PeerbenchMultipleChoiceResponseSchemaV1
>;

// Score schema
export const PeerbenchMultipleChoiceScoreSchemaV1 = defineScoreSchema({
  baseSchema: PeerbenchBaseScoreSchemaV1,
  kind: "pb.sc.mcq",
  schemaVersion: 1,
  fields: {
    extractedAnswers: z.array(z.string()),
  },
});
export type PeerbenchMultipleChoiceScoreV1 = z.infer<
  typeof PeerbenchMultipleChoiceScoreSchemaV1
>;
