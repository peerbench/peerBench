import { defineResponseSchema, defineScoreSchema } from "@/schemas";
import { BaseLLMChatResponseSchemaV1 } from "@/schemas/llm/response";
import {
  BaseTestCaseSchemaV1,
  defineTestCaseSchema,
} from "@/schemas/test-case";
import { z } from "zod";
import { PeerbenchBaseScoreSchemaV1 } from "../score";

// Test case schema
export const PeerbenchOpenEndedTestCaseSchemaV1 = defineTestCaseSchema({
  kind: "pb.ts.open-ended",
  schemaVersion: 1,
  baseSchema: BaseTestCaseSchemaV1,
  fields: {
    question: z.string(),
    answer: z.string().optional(),
  },
});
export type PeerbenchOpenEndedTestCaseV1 = z.infer<
  typeof PeerbenchOpenEndedTestCaseSchemaV1
>;

// Response schema
export const PeerbenchOpenEndedResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseLLMChatResponseSchemaV1,
  kind: "pb.rs.open-ended",
  schemaVersion: 1,
});
export type PeerbenchOpenEndedResponseV1 = z.infer<
  typeof PeerbenchOpenEndedResponseSchemaV1
>;

// Score schema
export const PeerbenchOpenEndedScoreSchemaV1 = defineScoreSchema({
  baseSchema: PeerbenchBaseScoreSchemaV1,
  kind: "pb.sc.open-ended",
  schemaVersion: 1,
  fields: {},
});
export type PeerbenchOpenEndedScoreV1 = z.infer<
  typeof PeerbenchOpenEndedScoreSchemaV1
>;
