import { JSONFileStorage } from "@/storages/json-file";
import z from "zod";
import {
  ExactMatchResponseSchemaV1,
  ExactMatchResponseV1,
  ExactMatchScoreSchemaV1,
  ExactMatchScoreV1,
  ExactMatchTestCaseSchemaV1,
  ExactMatchTestCaseV1,
} from "../schema-sets/exact-match.v1";

export class ExactMatchJSONStorage extends JSONFileStorage<
  ExactMatchTestCaseV1 | ExactMatchResponseV1 | ExactMatchScoreV1
> {
  constructor(config: { path: string; chunkSize?: number }) {
    super({
      path: config.path,
      chunkSize: config.chunkSize,
      schema: z.union([
        ExactMatchTestCaseSchemaV1,
        ExactMatchResponseSchemaV1,
        ExactMatchScoreSchemaV1,
      ]),
    });
  }
}
