import { BaseResponseV1, BaseTestCaseV1 } from "@/schemas";
import { BaseScoreV1 } from "@/schemas/score";

export abstract class AbstractAggregator {
  abstract push(params: {
    score: BaseScoreV1;
    testCase?: BaseTestCaseV1;
    response?: BaseResponseV1;
  }): Promise<void>;

  abstract aggregate(config?: unknown): Promise<unknown>;
}
