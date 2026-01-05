export abstract class AbstractProvider {
  abstract readonly kind: string;
}

export type ProviderResponse<TData = unknown> = {
  startedAt: number;
  completedAt: number;
  data: TData;
};
