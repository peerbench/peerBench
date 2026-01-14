import { JSONFileStorage } from "@/storages/json-file";
import z from "zod";
import {
  EchoBasicResponseSchemaV1,
  EchoBasicResponseV1,
  EchoBasicScoreSchemaV1,
  EchoBasicScoreV1,
  EchoBasicTestCaseSchemaV1,
  EchoBasicTestCaseV1,
} from "../schema-sets/echo.v1";

/**
 * Storages are the abstractions that are responsible for persisting benchmark entities outside your codebase.
 *
 * This example uses one of the predefined Storage implementations from the SDK which is JSONFileStorage.
 * This storage allows you to store benchmark entity(ies) in a regular JSON file as an array of objects.
 */
export class EchoBasicJSONStorage extends JSONFileStorage<
  EchoBasicTestCaseV1 | EchoBasicResponseV1 | EchoBasicScoreV1 // We want to store all type of entities
> {
  constructor(config: { path: string; chunkSize?: number }) {
    super({
      path: config.path,
      chunkSize: config.chunkSize,

      // Union schema combines all the entities so each item of the array can be one of them.
      schema: z.union([
        EchoBasicTestCaseSchemaV1,
        EchoBasicResponseSchemaV1,
        EchoBasicScoreSchemaV1,
      ]),
    });
  }
}
