import { JSONFileStorage } from "@/storages/json-file";
import {
  MCQResponseSchemaV1,
  MCQResponseV1,
  MCQScoreSchemaV1,
  MCQScoreV1,
  MCQTestCaseSchemaV1,
  MCQTestCaseV1,
} from "../schema-sets/mcq.v1";
import {
  QAResponseSchemaV1,
  QAResponseV1,
  QAScoreSchemaV1,
  QAScoreV1,
  QATestCaseSchemaV1,
  QATestCaseV1,
} from "../schema-sets/qa.v1";
import {
  MultiTurnResponseSchemaV1,
  MultiTurnResponseV1,
  MultiTurnScoreSchemaV1,
  MultiTurnScoreV1,
  MultiTurnTestCaseSchemaV1,
  MultiTurnTestCaseV1,
} from "../schema-sets/multi-turn.v1";
import z from "zod";

export class PeerbenchJSONStorage extends JSONFileStorage<
  | MCQTestCaseV1
  | MCQResponseV1
  | MCQScoreV1
  | QATestCaseV1
  | QAResponseV1
  | QAScoreV1
  | MultiTurnTestCaseV1
  | MultiTurnResponseV1
  | MultiTurnScoreV1
> {
  constructor(config: { path: string; chunkSize?: number }) {
    super({
      path: config.path,
      chunkSize: config.chunkSize,

      schema: z.union([
        MCQTestCaseSchemaV1,
        MCQResponseSchemaV1,
        MCQScoreSchemaV1,
        QATestCaseSchemaV1,
        QAResponseSchemaV1,
        QAScoreSchemaV1,
        MultiTurnTestCaseSchemaV1,
        MultiTurnResponseSchemaV1,
        MultiTurnScoreSchemaV1,
      ]),
    });
  }
}
