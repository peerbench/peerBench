import { JSONFileStorage } from "@/storages/json-file";
import z from "zod";
import {
  TextTransformEchoResponseSchemaV1,
  TextTransformEchoResponseV1,
  TextTransformEchoScoreSchemaV1,
  TextTransformEchoScoreV1,
  TextTransformEchoTestCaseSchemaV1,
  TextTransformEchoTestCaseV1,
} from "../schema-sets/echo.v1";
import {
  TextTransformReverseResponseSchemaV1,
  TextTransformReverseResponseV1,
  TextTransformReverseScoreSchemaV1,
  TextTransformReverseScoreV1,
  TextTransformReverseTestCaseSchemaV1,
  TextTransformReverseTestCaseV1,
} from "../schema-sets/reverse.v1";

export class TextTransformJSONStorage extends JSONFileStorage<
  | TextTransformEchoTestCaseV1
  | TextTransformEchoResponseV1
  | TextTransformEchoScoreV1
  | TextTransformReverseTestCaseV1
  | TextTransformReverseResponseV1
  | TextTransformReverseScoreV1
> {
  constructor(config: { path: string; chunkSize?: number }) {
    super({
      path: config.path,
      chunkSize: config.chunkSize,
      schema: z.union([
        TextTransformEchoTestCaseSchemaV1,
        TextTransformEchoResponseSchemaV1,
        TextTransformEchoScoreSchemaV1,
        TextTransformReverseTestCaseSchemaV1,
        TextTransformReverseResponseSchemaV1,
        TextTransformReverseScoreSchemaV1,
      ]),
    });
  }
}
