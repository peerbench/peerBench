import { BaseScoreV1, BaseTestCaseV1, BaseResponseV1 } from "@/schemas";

export function defineAggregator<
  TParams extends {
    results: {
      testCase: TTestCase;
      response: TResponse;
      score: TScore;
    }[];
  },
  TScore extends BaseScoreV1 = BaseScoreV1,
  TTestCase extends BaseTestCaseV1 = BaseTestCaseV1,
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TOutput = unknown,
>(aggregator: Aggregator<TParams, TTestCase, TResponse, TScore, TOutput>) {
  return aggregator;
}

export type Aggregator<
  TParams extends {
    results: {
      testCase: TTestCase;
      response: TResponse;
      score: TScore;
    }[];
  },
  TTestCase extends BaseTestCaseV1 = BaseTestCaseV1,
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
  TOutput = unknown,
> = (params: TParams) => Promise<TOutput>;
