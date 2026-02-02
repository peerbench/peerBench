import { Callable } from "@/providers/callables/callable";
import { AbstractScorer } from "@/scorers";
import { BaseTestCaseV1 } from "@/schemas/test-case";
import { BaseResponseV1 } from "@/schemas/response";
import { BaseScoreV1 } from "@/schemas/score";

export type RunnerParams = {
  testCase: BaseTestCaseV1;
  target: Callable;
  scorer?: AbstractScorer;
};

export type RunnerResult = {
  response: BaseResponseV1;
  score?: BaseScoreV1;
};
