import { readFile } from "node:fs/promises";
import {
  SimpleSystemPromptSchemaV1,
  type SimpleSystemPromptV1,
} from "peerbench/schemas/llm";
import { sha256 } from "./sha256";
import type { SystemPromptConfig } from "@/schemas/system-prompt-config";

async function resolveSystemPrompt(
  config: SystemPromptConfig,
): Promise<SimpleSystemPromptV1> {
  let content: string;

  if (typeof config === "string") {
    content = config;
  } else {
    switch (config.type) {
      case "inline":
        content = config.content;
        break;
      case "file":
        content = await readFile(config.path, "utf-8");
        break;
      case "langfuse":
        content = await fetchLangfusePrompt(config);
        break;
    }
  }

  return SimpleSystemPromptSchemaV1.new({
    id: sha256(content),
    version: 1,
    content,
  });
}

async function fetchLangfusePrompt(config: {
  name: string;
  label?: string;
  publicKey?: string;
  secretKey?: string;
  baseUrl?: string;
}): Promise<string> {
  const publicKey = config.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = config.secretKey ?? process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw new Error(
      "Langfuse credentials required: provide publicKey/secretKey in config or set LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY env vars",
    );
  }

  const baseUrl = (
    config.baseUrl ??
    process.env.LANGFUSE_HOST ??
    "https://cloud.langfuse.com"
  ).replace(/\/$/, "");

  const url = new URL(
    `/api/public/v2/prompts/${encodeURIComponent(config.name)}`,
    baseUrl,
  );
  if (config.label) {
    url.searchParams.set("label", config.label);
  }

  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString(
    "base64",
  );

  const response = await fetch(url, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Langfuse prompt "${config.name}": ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    prompt: string | unknown;
  };

  if (typeof data.prompt === "string") {
    return data.prompt;
  }

  return JSON.stringify(data.prompt);
}

export { resolveSystemPrompt };
