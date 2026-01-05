import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { bufferToString } from "@/utils";
import { parseJSONL } from "@/utils/json";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";
import {
  ExampleMSKeywordsTestCaseSchemaV1,
  type ExampleMSKeywordsTestCaseV1,
} from "./test-cases/keywords.v1";

export class ExampleMSJSONDataLoader extends AbstractDataLoader {
  override readonly kind = "example.ms.load.json.data";

  override loadBenchmarkSpec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: { content: Uint8Array }
  ): BaseBenchmarkSpecV1 {
    // This example focuses on "multiple scorer implementations".
    // A real benchmark pack can define its own BenchmarkSpec schema and load it here.
    throw new Error("Multi-scorer example spec loading is not implemented");
  }

  override async loadData(params: {
    content: Uint8Array;
  }): Promise<LoaderResult<ExampleMSKeywordsTestCaseV1>> {
    const contentStr = bufferToString(params.content).trim();
    const items: unknown[] = contentStr.startsWith("[")
      ? JSON.parse(contentStr)
      : parseJSONL<unknown>(contentStr, { errorOnInvalid: true });

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid data: content must be a non-empty JSON array/JSONL");
    }

    const testCases: ExampleMSKeywordsTestCaseV1[] = [];
    for (const [index, item] of items.entries()) {
      const parsed = ExampleMSKeywordsTestCaseSchemaV1.safeParse(item);
      if (!parsed.success) throw new Error(`Invalid test case at index ${index}`);
      testCases.push(parsed.data);
    }

    return { testCases, responses: [], scores: [] };
  }
}
