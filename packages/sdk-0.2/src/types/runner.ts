import { AbstractProvider } from "@/providers";
import { AbstractScorer } from "@/scorers";
import { IdGenerator } from ".";
import z from "zod";

export type Runner<
  TTestCase extends z.ZodObject,
  TResponse extends z.ZodObject,
  TScore extends z.ZodObject,
  TProvider extends AbstractProvider,
  TScorer extends AbstractScorer,
  TRunConfig extends Record<string, unknown>,
> = (params: {
  testCase: z.infer<TTestCase>;
  provider: TProvider;
  scorer?: TScorer;
  runConfig: TRunConfig;

  idGenerators?: {
    response?: IdGenerator;
    score?: IdGenerator;
  };
}) => Promise<{ response: z.infer<TResponse>; score?: z.infer<TScore> }>;

export type InferRunConfig<TRunConfigSchema extends z.ZodRawShape> = z.infer<
  z.ZodObject<TRunConfigSchema>
>;
