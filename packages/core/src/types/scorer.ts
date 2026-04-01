export abstract class AbstractScorer {
  readonly kind: string;

  constructor() {
    this.kind = (this.constructor as typeof AbstractScorer & { kind?: string }).kind!;
    if (!this.kind)
      throw new Error(
        `${this.constructor.name} must define "static readonly kind" as a constant property.`,
      );
  }

  abstract score(params: any): Promise<BaseScorerResult>;

  static withKind<
    TKind extends string,
    TThis extends abstract new (...args: any[]) => AbstractScorer,
  >(this: TThis, kind: TKind) {
    const base = this as unknown as new (...args: any[]) => any;
    const derived = class extends base {
      static readonly kind: TKind = kind;
      declare readonly kind: TKind;
    };

    return derived as unknown as (new (
      ...args: any[]
    ) => InstanceType<TThis> & {
      readonly kind: TKind;
    }) & {
      readonly kind: TKind;
    };
  }
}

export type BaseScorerResult = {
  value: number;
  explanation?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};
