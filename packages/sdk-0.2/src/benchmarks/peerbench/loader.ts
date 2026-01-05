import { GenericJSONArrayDataLoader } from "@/loaders/generic-array";
import {
  PeerbenchMultipleChoiceResponseSchemaV1,
  PeerbenchMultipleChoiceScoreSchemaV1,
  PeerbenchMultipleChoiceTestCaseSchemaV1,
} from "./test-cases/mcq.v1";
import {
  PeerbenchOpenEndedResponseSchemaV1,
  PeerbenchOpenEndedScoreSchemaV1,
  PeerbenchOpenEndedTestCaseSchemaV1,
} from "./test-cases/open-ended.v1";
import {
  PeerbenchBenchmarkSpecSchemaV1,
  PeerbenchBenchmarkSpecV1,
} from "./spec";
import z from "zod";
import { bufferToString } from "@/utils";

export class PeerbenchJSONDataLoader extends GenericJSONArrayDataLoader {
  override readonly kind = "pb.load.json.data";

  async loadBenchmarkSpec(params: {
    content: Uint8Array;
  }): Promise<PeerbenchBenchmarkSpecV1> {
    const content = bufferToString(params.content);
    const parsed = PeerbenchBenchmarkSpecSchemaV1.parse(content);

    return parsed;
  }

  protected override testCaseBuilder(data: any) {
    const testCaseValidation = z
      .union([
        PeerbenchMultipleChoiceTestCaseSchemaV1,
        PeerbenchOpenEndedTestCaseSchemaV1,
      ])
      .safeParse(data);
    return testCaseValidation.success ? testCaseValidation.data : undefined;
  }

  protected override async responseBuilder(data: any) {
    const responseValidation = z
      .union([
        PeerbenchMultipleChoiceResponseSchemaV1,
        PeerbenchOpenEndedResponseSchemaV1,
      ])
      .safeParse(data);
    return responseValidation.success ? responseValidation.data : undefined;
  }

  protected override async scoreBuilder(data: any) {
    const scoreValidation = z
      .union([
        PeerbenchMultipleChoiceScoreSchemaV1,
        PeerbenchOpenEndedScoreSchemaV1,
      ])
      .safeParse(data);
    return scoreValidation.success ? scoreValidation.data : undefined;
  }
}
