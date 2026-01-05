import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { bufferToString } from "@/utils";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";
import {
  ExampleEchoTestCaseSchemaV1,
  type ExampleEchoTestCaseV1,
} from "./test-cases/echo.v1";

/**
 * Loader is responsible for reading external data and mapping it into benchmark entities.
 * This example loader focuses only on loading test cases from a JSON array. It does not load
 * responses or scores, so those arrays are returned as empty.
 *
 * The validation happens in the loader (Zod parse). This is important because once data is loaded,
 * runner and scorers can assume that test cases are following the schema.
 */
export class ExampleJSONDataLoader extends AbstractDataLoader {
  override readonly kind = "example.load.json.data";

  override loadBenchmarkSpec(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    params: { content: Uint8Array }
  ): BaseBenchmarkSpecV1 {
    throw new Error("Example benchmark spec loading is not implemented");
  }

  override async loadData(params: {
    content: Uint8Array;
  }): Promise<LoaderResult<ExampleEchoTestCaseV1>> {
    const contentStr = bufferToString(params.content);
    const parsed = JSON.parse(contentStr);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("Invalid data: content must be a non-empty JSON array");
    }

    const testCases: ExampleEchoTestCaseV1[] = [];
    const seen: Set<string> = new Set();

    for (const [index, item] of parsed.entries()) {
      // Validate each item with the benchmark schema.
      const validation = ExampleEchoTestCaseSchemaV1.safeParse(item);
      if (!validation.success) {
        throw new Error(`Invalid test case at index ${index}`);
      }

      // Deduplicate by ID to make merging inputs predictable.
      const idStr = String(validation.data.id);
      if (!seen.has(idStr)) {
        seen.add(idStr);
        testCases.push(validation.data);
      }
    }

    // The loader contract always returns `{ testCases, responses, scores }`.
    // If you don't load responses/scores, return empty arrays.
    return { testCases, responses: [], scores: [] };
  }
}
