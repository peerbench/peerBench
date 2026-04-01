import { RunnerParams, RunnerResult } from "@/types";

export function defineRunner<TParams extends RunnerParams, TResult extends RunnerResult>(
  fn: (params: TParams) => Promise<TResult>
) {
  return fn;
}
