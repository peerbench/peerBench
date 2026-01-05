import { Runner, RunnerParams } from "@/types";
import { BaseCatalog } from "./base";
import { BaseResponseV1, BaseScoreV1 } from "@/schemas";

export class RunnerCatalog<
  TRunner extends Runner = Runner,
> extends BaseCatalog<TRunner> {
  override register<
    TResponse extends BaseResponseV1 = BaseResponseV1,
    TScore extends BaseScoreV1 = BaseScoreV1,
    TParams extends RunnerParams = RunnerParams,
  >(kind: string, runner: Runner<TResponse, TScore, TParams>) {
    super.register(kind, runner as unknown as TRunner);
  }
}
