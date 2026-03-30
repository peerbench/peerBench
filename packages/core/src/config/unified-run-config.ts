import { z } from "zod";
import {
  ProviderConfigSchema,
  type ProviderConfig,
} from "@/schemas/provider-config";

const StorageNameSchema = z
  .string()
  .describe("Storage name (must exist in the storage registry).");
const RunnerNameSchema = z
  .string()
  .describe("Runner name (must exist in the runner registry).");
const ScorerNameSchema = z
  .string()
  .describe("Scorer name (must exist in the scorer registry).");

const TargetConfigSchema = ProviderConfigSchema.and(
  z.object({
    name: z.string().optional().describe("Display name for the target."),
  }),
).describe("Target configuration.");

const TestCaseSourceSchema = z
  .object({
    storage: StorageNameSchema,
    params: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Storage-specific parameters."),
  })
  .describe("Test case loading configuration.");

const ScorerConfigSchema = z
  .object({
    type: ScorerNameSchema,
    params: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Scorer-specific parameters."),
  })
  .describe("Scorer configuration.");

const RunConfigSchema = z
  .object({
    runner: RunnerNameSchema,
    description: z
      .string()
      .optional()
      .describe("Description of the run config."),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for filtering/grouping."),
    targets: z
      .array(TargetConfigSchema)
      .min(1)
      .describe(
        "Multiple targets for comparison. Each target specifies its own provider and parameters.",
      ),
    maxParallel: z
      .int()
      .check(z.positive())
      .default(20)
      .describe("Max parallel executions. Shared between all targets."),
    testCases: z
      .array(TestCaseSourceSchema)
      .min(1)
      .describe("Test case sources."),
    scorer: ScorerConfigSchema.optional(),
    runnerParams: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Runner-specific parameters."),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Arbitrary metadata."),
  })
  .describe("Run config.");

type ProviderName = ProviderConfig["provider"];
type StorageName = z.infer<typeof StorageNameSchema>;
type RunnerName = z.infer<typeof RunnerNameSchema>;
type ScorerName = z.infer<typeof ScorerNameSchema>;
type TargetConfig = z.infer<typeof TargetConfigSchema>;
type TestCaseSource = z.infer<typeof TestCaseSourceSchema>;
type ScorerConfig = z.infer<typeof ScorerConfigSchema>;
type RunConfig = z.infer<typeof RunConfigSchema>;

export {
  RunConfigSchema,
  TargetConfigSchema,
  TestCaseSourceSchema,
  ScorerConfigSchema,
  StorageNameSchema,
  RunnerNameSchema,
  ScorerNameSchema,
  type ProviderName,
  type StorageName,
  type RunnerName,
  type ScorerName,
  type TargetConfig,
  type TestCaseSource,
  type ScorerConfig,
  type RunConfig,
};
