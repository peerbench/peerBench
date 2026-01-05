export abstract class AbstractScorer {
  abstract readonly kind: string;

  abstract score(params: any): Promise<BaseScorerResult | null>;
}

export type BaseScorerResult = {
  value: number;
  explanation?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};
