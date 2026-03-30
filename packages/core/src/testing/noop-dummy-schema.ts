import { z } from "zod";
import {
  BaseTestCaseSchemaV1,
  BaseScoreSchemaV1,
  defineResponseSchema,
  defineScoreSchema,
  defineTestCaseSchema,
  BaseResponseSchemaV1,
} from "peerbench/schemas";
import { PEERBENCH_NAMESPACE } from "peerbench";

const NoOpDummyKind = "noop/dummy" as const;

const NoOpDummyTestCaseSchemaV1 = defineTestCaseSchema({
  baseSchema: BaseTestCaseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: NoOpDummyKind,
  schemaVersion: 1,
  fields: {
    input: z.string().describe("Dummy input text"),
  },
});

type NoOpDummyTestCaseV1 = z.infer<typeof NoOpDummyTestCaseSchemaV1>;

const NoOpDummyResponseSchemaV1 = defineResponseSchema({
  baseSchema: BaseResponseSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: NoOpDummyKind,
  schemaVersion: 1,
  fields: {
    output: z.string().describe("Dummy output text"),
  },
});

type NoOpDummyResponseV1 = z.infer<typeof NoOpDummyResponseSchemaV1>;

const NoOpDummyScoreSchemaV1 = defineScoreSchema({
  baseSchema: BaseScoreSchemaV1,
  namespace: PEERBENCH_NAMESPACE,
  kind: NoOpDummyKind,
  schemaVersion: 1,
  fields: {
    randomValue: z.number().describe("Random score value between 0 and 1"),
  },
});

type NoOpDummyScoreV1 = z.infer<typeof NoOpDummyScoreSchemaV1>;

export {
  NoOpDummyKind,
  NoOpDummyTestCaseSchemaV1,
  NoOpDummyResponseSchemaV1,
  NoOpDummyScoreSchemaV1,
  type NoOpDummyTestCaseV1,
  type NoOpDummyResponseV1,
  type NoOpDummyScoreV1,
};
