import { defineAggregator } from "../define-aggregator";
import {
  PeerbenchMultipleChoiceResponseV1,
  PeerbenchMultipleChoiceScoreV1,
  PeerbenchMultipleChoiceTestCaseV1,
} from "./test-cases/mcq.v1";
import {
  PeerbenchOpenEndedResponseV1,
  PeerbenchOpenEndedScoreV1,
  PeerbenchOpenEndedTestCaseV1,
} from "./test-cases/open-ended.v1";

export const aggAvg = defineAggregator(
  async (params: {
    results: {
      testCase:
        | PeerbenchMultipleChoiceTestCaseV1
        | PeerbenchOpenEndedTestCaseV1;
      response:
        | PeerbenchMultipleChoiceResponseV1
        | PeerbenchOpenEndedResponseV1;
      score: PeerbenchMultipleChoiceScoreV1 | PeerbenchOpenEndedScoreV1;
    }[];
  }) => {
    const scores: Record<
      string,
      {
        total: number;
        count: number;
      }
    > = {};

    // Calculate the average score for each model
    for (const result of params.results) {
      const model = result.response.modelSlug;
      if (!scores[model]) {
        scores[model] = {
          count: 0,
          total: 0,
        };
      }
      scores[model].total += result.score.value;
      scores[model].count++;
    }

    return Object.fromEntries(
      Object.entries(scores).map(([model, score]) => [
        model,
        score.total / score.count,
      ])
    );
  }
);
