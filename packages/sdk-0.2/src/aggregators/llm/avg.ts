import { BaseResponseV1, BaseScoreV1, BaseTestCaseV1 } from "@/schemas";
import { AbstractAggregator } from "../abstract";
import { InferExtension } from "@/utilities";
import { ExtensionLLMResponseFieldsV1 } from "@/schemas/extensions/response/llm";
import { ExtensionLLMAsAJudgeScoreFieldsV1 } from "@/schemas/extensions/score/llm-as-a-judge-scorer";

export class AvgAggregator extends AbstractAggregator {
  private separateBySystemPrompt: boolean = false;
  private scores: Record<
    string,
    {
      model: string;
      total: number;
      count: number;
      systemPromptId?: string;
    }
  > = {};

  constructor(params: { separateBySystemPrompt?: boolean }) {
    super();
    this.separateBySystemPrompt = params.separateBySystemPrompt ?? false;
  }

  override async push(params: {
    score: InferExtension<
      typeof ExtensionLLMAsAJudgeScoreFieldsV1,
      BaseScoreV1
    >;
    response: InferExtension<
      typeof ExtensionLLMResponseFieldsV1,
      BaseResponseV1
    >;
    testCase?: BaseTestCaseV1;
  }) {
    const model = params.response.modelSlug;
    const compositeKey = model + (params.response.systemPromptId ?? "");
    const key = this.separateBySystemPrompt ? compositeKey : model;

    if (!this.scores[key]) {
      this.scores[key] = {
        model,
        systemPromptId: params.response.systemPromptId,
        count: 0,
        total: 0,
      };
    }

    this.scores[key].total += params.score.value;
    this.scores[key].count++;
  }

  override async aggregate() {
    return Object.fromEntries(
      Object.entries(this.scores).map(([model, score]) => [
        model,
        {
          ...score,
          average: score.total / score.count,
        },
      ])
    );
  }
}
