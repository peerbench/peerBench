export function defineRunner<
  TParams,
  TResult,
>(fn: (params: TParams) => Promise<TResult>) {
  return fn;
}
