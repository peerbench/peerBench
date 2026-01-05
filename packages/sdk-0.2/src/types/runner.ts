import { BaseTestCaseV1 } from "@/schemas/test-case";
import { BaseResponseV1 } from "@/schemas/response";
import { BaseScoreV1 } from "@/schemas/score";
import { AbstractProvider } from "@/providers";
import { AbstractScorer } from "@/scorers/abstract";
import { IdGenerator } from "@/types";
import { BaseSystemPromptV1 } from "@/schemas/llm/system-prompt";
import { BaseBenchmarkSpecV1 } from "@/schemas/benchmark-spec";

/**
 * Minimum set of parameters that a runner needs to accept
 */
export type RunnerParams = {
  testCase: BaseTestCaseV1;
  provider: AbstractProvider;
  spec?: BaseBenchmarkSpecV1;
  scorer?: AbstractScorer;
  runConfig: {
    model: string;
    llmJudgeModel?: string;
  };
  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
  [key: string]: unknown;
};

export type RunnerResult<
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
> = {
  response: TResponse;
  score?: TScore;
  [key: string]: unknown;
};

export type Runner<
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
  TParams extends RunnerParams = RunnerParams,
> = (params: TParams) => Promise<RunnerResult<TResponse, TScore>>;

// Alternative runner types
export type LLMChatRunnerParams = RunnerParams & {
  systemPrompt?: BaseSystemPromptV1;
};

export type LLMChatRunner<
  TResponse extends BaseResponseV1 = BaseResponseV1,
  TScore extends BaseScoreV1 = BaseScoreV1,
  TParams extends LLMChatRunnerParams = LLMChatRunnerParams,
> = (params: TParams) => Promise<RunnerResult<TResponse, TScore>>;
