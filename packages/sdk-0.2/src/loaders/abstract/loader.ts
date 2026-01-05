import { BaseResponseV1, BaseScoreV1, BaseTestCaseV1 } from "@/schemas";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";
import { MaybePromise } from "@/types";

export type LoaderResult<
  TTestCase extends BaseTestCaseV1 = BaseTestCaseV1,
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
  TBenchmarkSpec extends BaseBenchmarkSpecV1 = BaseBenchmarkSpecV1,
> = {
  testCases: TTestCase[];
  responses: TResponse[];
  scores: TScore[];

  benchmarkSpec?: TBenchmarkSpec;
};

export abstract class AbstractLoader {
  abstract readonly kind: string;

  abstract loadData(params: unknown): MaybePromise<LoaderResult>;
  abstract loadBenchmarkSpec(
    params: unknown
  ): MaybePromise<BaseBenchmarkSpecV1>;
}
