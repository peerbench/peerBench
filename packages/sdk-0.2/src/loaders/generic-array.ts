import { BaseTestCaseV1 } from "@/schemas/test-case";
import { BaseResponseV1 } from "@/schemas/response";
import { BaseScoreV1 } from "@/schemas/score";
import { MaybePromise } from "@/types";
import { AbstractDataLoader } from "@/loaders/abstract/data";
import { LoaderResult } from "@/loaders/abstract/loader";
import { tryParseJson, parseJSONL } from "@/utils/json";
import { bufferToString } from "@/utils/string";

export type GenericJSONArrayLoaderResult<
  TTestCase extends BaseTestCaseV1 = BaseTestCaseV1,
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
> = LoaderResult<TTestCase, TResponse, TScore>;

export abstract class GenericJSONArrayDataLoader<
  TTestCase extends BaseTestCaseV1 = BaseTestCaseV1,
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
> extends AbstractDataLoader {
  protected abstract testCaseBuilder(
    data: any,
    context: {
      result: GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore>;
    }
  ): MaybePromise<TTestCase | undefined>;

  protected async responseBuilder(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: {
      result: GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore>;
    }
  ): Promise<TResponse | undefined> {
    return undefined;
  }

  protected async scoreBuilder(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: any,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: {
      result: GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore>;
    }
  ): Promise<TScore | undefined> {
    return undefined;
  }

  async loadData(params: {
    content: Uint8Array;
  }): Promise<GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore>> {
    const contentStr = bufferToString(params.content);
    let data: unknown[] | undefined = tryParseJson<unknown[]>(contentStr);

    if (!data) {
      data = parseJSONL<unknown>(contentStr);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(
        "Invalid data: content must be a non-empty JSON or JSONL array"
      );
    }

    return this.transformArrayToResult(data);
  }

  private async transformArrayToResult(
    data: unknown[]
  ): Promise<GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore>> {
    const includedTestCaseIds: Set<string> = new Set();
    const includedResponseIds: Set<string> = new Set();
    const includedScoreIds: Set<string> = new Set();
    const result: GenericJSONArrayLoaderResult<TTestCase, TResponse, TScore> = {
      testCases: [],
      responses: [],
      scores: [],
    };

    for (const item of data) {
      const testCase = await this.testCaseBuilder(item, { result });
      const response = await this.responseBuilder(item, { result });
      const score = await this.scoreBuilder(item, { result });

      if (testCase) {
        const testCaseIdStr = String(testCase.id);
        if (!includedTestCaseIds.has(testCaseIdStr)) {
          includedTestCaseIds.add(testCaseIdStr);
          result.testCases.push(testCase);
        }
      }

      if (response) {
        const responseIdStr = String(response.id);
        if (!includedResponseIds.has(responseIdStr)) {
          includedResponseIds.add(responseIdStr);
          result.responses.push(response);
        }
      }

      if (score) {
        const scoreIdStr = String(score.id);
        if (!includedScoreIds.has(scoreIdStr)) {
          includedScoreIds.add(scoreIdStr);
          result.scores.push(score);
        }
      }

      if (!testCase && !response && !score) {
        throw new Error("Incompatible object format");
      }
    }

    return result;
  }
}
