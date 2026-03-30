import type { z } from "zod";
import type { AbstractScorer } from "peerbench/scorers";

function defineScorerEntry<
  TScorer extends AbstractScorer,
  TConfigSchema extends z.ZodType,
>(entry: {
  description: string;
  longDescription?: string;
  configSchema?: TConfigSchema;
  instantiateFromConfig: (
    config: Record<string, unknown>,
    configSchema: TConfigSchema | undefined,
  ) => TScorer;
}): ScorerEntry<TScorer> {
  return {
    ...entry,
    instantiateFromConfig: (config) =>
      entry.instantiateFromConfig(config ?? {}, entry.configSchema),
  };
}

interface ScorerEntry<TScorer extends AbstractScorer = AbstractScorer> {
  description: string;
  longDescription?: string;
  configSchema?: z.ZodType;
  instantiateFromConfig: (config?: Record<string, unknown>) => TScorer;
}

export { defineScorerEntry, type ScorerEntry };
