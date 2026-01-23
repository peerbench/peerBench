import {
  IdGenerator,
  InferRunConfig,
  ProviderCtor,
  Runner,
  ScorerCtor,
} from "@/types";
import { idGeneratorUUIDv7 } from "@/utils";
import z from "zod";

export function defineRunner<
  const TProviders extends ProviderCtor[],
  const TScorers extends ScorerCtor[],
  const TSchemaSets extends SchemaSetDefinition[],
  const TRunConfigSchema extends z.ZodRawShape = {},
>(
  config: {
    schemaSets: TSchemaSets;
    providers: TProviders;
    scorers: TScorers;
    runConfigSchema?: TRunConfigSchema;

    /**
     * @default true
     */
    parseRunConfig?: boolean;
    defaults?: {
      scorer?: InstanceType<TScorers[number]>;
      responseIdGenerator?: IdGenerator;
      scoreIdGenerator?: IdGenerator;
    };
  },
  fn: Runner<
    TSchemaSets[number]["testCase"],
    TSchemaSets[number]["response"],
    TSchemaSets[number]["score"],
    InstanceType<TProviders[number]>,
    InstanceType<TScorers[number]>,
    InferRunConfig<TRunConfigSchema>
  >
) {
  const func = async (params: Parameters<typeof fn>[0]) => {
    if (config.runConfigSchema && config.parseRunConfig !== false) {
      z.object(config.runConfigSchema).parse(params.runConfig);
    }

    if (params.idGenerators && !params.idGenerators.response) {
      params.idGenerators.response =
        config.defaults?.responseIdGenerator ?? idGeneratorUUIDv7;
    }

    if (params.idGenerators && !params.idGenerators.score) {
      params.idGenerators.score =
        config.defaults?.scoreIdGenerator ?? idGeneratorUUIDv7;
    }

    if (params.scorer === undefined) {
      params.scorer = config.defaults?.scorer ?? undefined;
    }

    return await fn(params);
  };

  return Object.assign(func, {
    /**
     * The configuration that was used to define the runner.
     */
    config: {
      ...config,
      runConfigSchema: z.object(config.runConfigSchema),
    },
  });
}

type SchemaSetDefinition<
  TTestCase extends z.ZodObject = z.ZodObject,
  TResponse extends z.ZodObject = z.ZodObject,
  TScore extends z.ZodObject = z.ZodObject,
> = {
  testCase: TTestCase;
  response: TResponse;
  score: TScore;
};
