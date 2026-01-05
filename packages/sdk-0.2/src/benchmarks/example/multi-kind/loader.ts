import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { bufferToString } from "@/utils";
import { parseJSONL } from "@/utils/json";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";
import {
  ExampleMKEchoTestCaseSchemaV1,
  type ExampleMKEchoTestCaseV1,
} from "./test-cases/echo.v1";
import {
  ExampleMKReverseTestCaseSchemaV1,
  type ExampleMKReverseTestCaseV1,
} from "./test-cases/reverse.v1";

type TestCase = ExampleMKEchoTestCaseV1 | ExampleMKReverseTestCaseV1;

/**
 * In the multi-kind example we still load "test cases", but we don't know which schema each JSON item
 * belongs to until we inspect it.
 *
 * The simplest approach is: try to parse with schema A, if it fails try schema B, and so on.
 * That’s what this loader does. It accepts both JSON arrays and JSONL to make quick experiments easy.
 *
 * Real benchmarks often have a dedicated `kind` field in the raw data so you can dispatch without
 * trying every schema. That’s a nice optimization, but the "try-parse" approach is surprisingly handy
 * when you are iterating on a benchmark pack.
 */
export class ExampleMKJSONDataLoader extends AbstractDataLoader {
  override readonly kind = "example.mk.load.json.data";

  override loadBenchmarkSpec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: { content: Uint8Array }
  ): BaseBenchmarkSpecV1 {
    // This example focuses on "multiple test case kinds".
    // A real benchmark pack can define its own BenchmarkSpec schema and load it here.
    throw new Error("Multi-kind example spec loading is not implemented");
  }

  override async loadData(params: {
    content: Uint8Array;
  }): Promise<LoaderResult<TestCase>> {
    const contentStr = bufferToString(params.content).trim();
    const items: unknown[] = contentStr.startsWith("[")
      ? JSON.parse(contentStr)
      : parseJSONL<unknown>(contentStr, { errorOnInvalid: true });

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Invalid data: content must be a non-empty JSON array/JSONL");
    }

    const testCases: TestCase[] = [];
    for (const [index, item] of items.entries()) {
      const parsed =
        ExampleMKEchoTestCaseSchemaV1.safeParse(item).success
          ? ExampleMKEchoTestCaseSchemaV1.parse(item)
          : ExampleMKReverseTestCaseSchemaV1.safeParse(item).success
            ? ExampleMKReverseTestCaseSchemaV1.parse(item)
            : null;

      if (!parsed) {
        throw new Error(`Invalid test case at index ${index}`);
      }
      testCases.push(parsed);
    }

    return { testCases, responses: [], scores: [] };
  }
}
