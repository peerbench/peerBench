import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { bufferToString } from "@/utils";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";
import {
  ExampleEchoTestCaseSchemaV1,
  type ExampleEchoTestCaseV1,
} from "./test-cases/echo.v1";

/**
 * Tutorial: loaders are how bytes become entities.
 *
 * A loader sits at the boundary between "some external format" and "SDK entities".
 * You might load from JSON, JSONL, Parquet, SQLite rows, an HTTP endpoint, etc.
 *
 * This particular loader is intentionally small: it only supports a JSON array of TestCases.
 * (Many real loaders can also load previously saved Responses/Scores, but that's optional.)
 *
 * The key rule is: validate at the boundary. If you return `TestCase[]` here, everything
 * downstream (runner/scorer/orchestrator) can assume the shape is correct.
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
      // If your data format needs mapping (e.g., DB columns -> object fields),
      // you would do that mapping before calling `.parse()`/`.safeParse()`.
      const validation = ExampleEchoTestCaseSchemaV1.safeParse(item);
      if (!validation.success) {
        throw new Error(`Invalid test case at index ${index}`);
      }

      // Deduplicate by ID to make merges deterministic (optional, but useful in practice).
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
