import type { Callable } from "./provider";
import type { AbstractScorer } from "./scorer";
import type { BaseTestCaseV1 } from "../schemas/base-test-case";
import type { BaseResponseV1 } from "../schemas/base-response";
import type { BaseScoreV1 } from "../schemas/base-score";

export type RunnerParams = {
  testCase: BaseTestCaseV1;
  target: Callable;
  scorer?: AbstractScorer;
};

export type RunnerResult = {
  response: BaseResponseV1;
  score?: BaseScoreV1;
};
