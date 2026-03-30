import type { z } from "zod";
import type { RunnerResult } from "peerbench";
import type { BaseTestCaseV1 } from "peerbench/schemas";
import type { TargetConfig, ScorerConfig } from "@/config/unified-run-config";

function defineRunnerEntry<TConfigSchema extends z.ZodType>(entry: {
  description: string;
  longDescription?: string;
  configSchema?: TConfigSchema;
  executeFromConfig: (
    config: ExecutionConfig,
    configSchema: TConfigSchema | undefined,
  ) => Promise<RunnerResult>;
}): RunnerEntry {
  return {
    ...entry,
    executeFromConfig: (config) =>
      entry.executeFromConfig(
        { ...config, runnerParams: config.runnerParams ?? {} },
        entry.configSchema,
      ),
  };
}

interface ExecutionConfig {
  testCase: BaseTestCaseV1;
  target: TargetConfig;
  runnerParams?: Record<string, unknown>;
  scorerConfig?: ScorerConfig;
}

interface RunnerEntry {
  description: string;
  longDescription?: string;
  configSchema?: z.ZodType;
  executeFromConfig: (config: ExecutionConfig) => Promise<RunnerResult>;
}

export { defineRunnerEntry, type RunnerEntry, type ExecutionConfig };
