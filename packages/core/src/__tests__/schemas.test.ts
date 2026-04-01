import { describe, it, expect } from "vitest";
import { ProviderConfigSchema } from "@/schemas/provider-config";
import { SystemPromptConfigSchema } from "@/schemas/system-prompt-config";

describe("ProviderConfigSchema", () => {
  it("accepts any provider name as string", () => {
    const result = ProviderConfigSchema.safeParse({
      provider: "openai",
      params: { model: "gpt-4" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts unknown provider names", () => {
    const result = ProviderConfigSchema.safeParse({
      provider: "my-custom-provider",
      params: { endpoint: "http://localhost:8080" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts provider without params", () => {
    const result = ProviderConfigSchema.safeParse({
      provider: "openai",
    });
    expect(result.success).toBe(true);
  });

  it("rejects config without provider", () => {
    const result = ProviderConfigSchema.safeParse({
      params: { model: "gpt-4" },
    });
    expect(result.success).toBe(false);
  });
});

describe("SystemPromptConfigSchema", () => {
  it("accepts a plain string", () => {
    const result = SystemPromptConfigSchema.safeParse("You are a helpful assistant.");
    expect(result.success).toBe(true);
  });

  it("accepts inline type", () => {
    const result = SystemPromptConfigSchema.safeParse({
      type: "inline",
      content: "You are a helpful assistant.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts file type", () => {
    const result = SystemPromptConfigSchema.safeParse({
      type: "file",
      path: "./prompts/system.txt",
    });
    expect(result.success).toBe(true);
  });

  it("accepts langfuse type", () => {
    const result = SystemPromptConfigSchema.safeParse({
      type: "langfuse",
      name: "my-prompt",
      label: "production",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown type", () => {
    const result = SystemPromptConfigSchema.safeParse({
      type: "unknown",
      content: "test",
    });
    expect(result.success).toBe(false);
  });
});
