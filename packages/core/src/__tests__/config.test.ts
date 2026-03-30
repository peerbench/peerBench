import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RunConfigSchema } from "@/config/unified-run-config";
import { validateRunConfig, type Registries } from "@/config/validate-run-config";
import { createRegistry } from "@/registry/create-registry";
import { resolveEnvVariables } from "@/utils/resolve-env-variables";
import { z } from "zod";

describe("RunConfigSchema", () => {
  it("accepts valid config with string runner/scorer/storage names", () => {
    const result = RunConfigSchema.safeParse({
      runner: "my-custom-runner",
      targets: [{ provider: "openai", params: { model: "gpt-4" } }],
      testCases: [{ storage: "my-storage" }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts any string for runner name (not enum-restricted)", () => {
    const result = RunConfigSchema.safeParse({
      runner: "completely-unknown-runner-name",
      targets: [{ provider: "any-provider" }],
      testCases: [{ storage: "any-storage" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects config without required fields", () => {
    const result = RunConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects config with empty targets", () => {
    const result = RunConfigSchema.safeParse({
      runner: "test",
      targets: [],
      testCases: [{ storage: "s" }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional scorer", () => {
    const result = RunConfigSchema.safeParse({
      runner: "test",
      targets: [{ provider: "p" }],
      testCases: [{ storage: "s" }],
      scorer: { type: "my-scorer", params: { threshold: 0.8 } },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scorer?.type).toBe("my-scorer");
    }
  });

  it("defaults maxParallel to 20", () => {
    const result = RunConfigSchema.safeParse({
      runner: "test",
      targets: [{ provider: "p" }],
      testCases: [{ storage: "s" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxParallel).toBe(20);
    }
  });
});

describe("validateRunConfig", () => {
  const mockRegistries: Registries = {
    runners: createRegistry({
      "test-runner": {
        description: "Test",
        configSchema: z.object({
          speed: z.string().optional(),
        }),
        executeFromConfig: async () => ({} as any),
      },
    }),
    scorers: createRegistry({
      "test-scorer": {
        description: "Test",
        configSchema: z.object({
          threshold: z.number().optional(),
        }),
        instantiateFromConfig: () => ({} as any),
      },
    }),
    storages: createRegistry({
      "test-storage": {
        description: "Test",
        configSchema: z.object({
          path: z.string().optional(),
        }),
        instantiateFromConfig: () => ({} as any),
      },
    }),
    providers: createRegistry({
      "test-provider": {
        description: "Test",
        instantiateFromConfig: () => ({} as any),
        getEndpoint: () => "http://localhost",
      },
    }),
  };

  it("validates a correct config", () => {
    const result = validateRunConfig(
      {
        runner: "test-runner",
        targets: [{ provider: "test-provider" }],
        testCases: [{ storage: "test-storage" }],
      },
      mockRegistries,
    );
    expect(result.valid).toBe(true);
  });

  it("returns error for unknown runner", () => {
    const result = validateRunConfig(
      {
        runner: "unknown-runner",
        targets: [{ provider: "test-provider" }],
        testCases: [{ storage: "test-storage" }],
      },
      mockRegistries,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]!.path).toBe("runner");
      expect(result.errors[0]!.message).toContain("Unknown runner");
    }
  });

  it("returns error for unknown provider", () => {
    const result = validateRunConfig(
      {
        runner: "test-runner",
        targets: [{ provider: "unknown-provider" }],
        testCases: [{ storage: "test-storage" }],
      },
      mockRegistries,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path.includes("provider"))).toBe(
        true,
      );
    }
  });

  it("returns error for unknown storage", () => {
    const result = validateRunConfig(
      {
        runner: "test-runner",
        targets: [{ provider: "test-provider" }],
        testCases: [{ storage: "unknown-storage" }],
      },
      mockRegistries,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path.includes("storage"))).toBe(true);
    }
  });

  it("returns error for unknown scorer", () => {
    const result = validateRunConfig(
      {
        runner: "test-runner",
        targets: [{ provider: "test-provider" }],
        testCases: [{ storage: "test-storage" }],
        scorer: { type: "unknown-scorer" },
      },
      mockRegistries,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.path.includes("scorer"))).toBe(true);
    }
  });
});

describe("resolveEnvVariables", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves :env suffix keys from environment", () => {
    process.env.MY_API_KEY = "secret-123";
    const result = resolveEnvVariables({
      "apiKey:env": "MY_API_KEY",
    });
    expect(result).toEqual({ apiKey: "secret-123" });
  });

  it("resolves nested objects", () => {
    process.env.DB_PASSWORD = "p@ss";
    const result = resolveEnvVariables({
      database: {
        "password:env": "DB_PASSWORD",
        host: "localhost",
      },
    });
    expect(result).toEqual({
      database: { password: "p@ss", host: "localhost" },
    });
  });

  it("resolves arrays with objects", () => {
    process.env.TOKEN = "tok-123";
    const result = resolveEnvVariables({
      targets: [{ "authToken:env": "TOKEN", model: "gpt-4" }],
    });
    expect(result).toEqual({
      targets: [{ authToken: "tok-123", model: "gpt-4" }],
    });
  });

  it("throws for missing env variables", () => {
    expect(() =>
      resolveEnvVariables({ "apiKey:env": "NONEXISTENT_VAR" }),
    ).toThrow("Missing environment variables");
  });

  it("passes through non-env keys", () => {
    const result = resolveEnvVariables({
      name: "test",
      count: 42,
      nested: { value: true },
    });
    expect(result).toEqual({
      name: "test",
      count: 42,
      nested: { value: true },
    });
  });
});
