import { z } from "zod";

const PROMPT_METADATA_KEY = "promptMetadata" as const;
const TRACE_METADATA_KEY = "traceMetadata" as const;
const PROMPT_METADATA_HEADER = "x-prompt-metadata" as const;

const PromptMetadataSchema = z.object({
  promptName: z.string(),
  promptLabel: z.string().optional(),
  promptVersion: z.number(),
  agentName: z.string().optional(),
  promptHash: z.string().optional(),
});

const TraceMetadataSchema = z.object({
  traceId: z.string(),
  traceUrl: z.string().optional(),
});

function parsePromptMetadataHeader(
  headerValue: string | null | undefined,
): PromptMetadata | undefined {
  if (!headerValue) return undefined;
  try {
    const raw = JSON.parse(headerValue);
    if (!raw?.prompts?.[0]) return undefined;
    return PromptMetadataSchema.parse({
      ...raw.prompts[0],
      promptHash: raw.promptHash,
    });
  } catch {
    return undefined;
  }
}

function parsePromptMetadataChunk(data: unknown): PromptMetadata | undefined {
  if (!data || typeof data !== "object") return undefined;
  try {
    const raw = data as Record<string, unknown>;
    if (!Array.isArray(raw.prompts) || !raw.prompts[0]) return undefined;
    return PromptMetadataSchema.parse({
      ...(raw.prompts[0] as object),
      promptHash: raw.promptHash,
    });
  } catch {
    return undefined;
  }
}

function parseTraceMetadataChunk(data: unknown): TraceMetadata | undefined {
  if (!data || typeof data !== "object") return undefined;
  const result = TraceMetadataSchema.safeParse(data);
  return result.success ? result.data : undefined;
}

function extractPromptFields(
  metadata: Record<string, unknown> | undefined,
): PromptDenormalizedFields {
  if (!metadata) return {};
  const raw = metadata[PROMPT_METADATA_KEY];
  if (!raw || typeof raw !== "object") return {};
  const result = PromptMetadataSchema.safeParse(raw);
  if (!result.success) return {};
  return {
    systemPromptId: result.data.promptName,
    systemPromptVersion: result.data.promptVersion,
    systemPromptHash: result.data.promptHash,
  };
}

type PromptMetadata = z.infer<typeof PromptMetadataSchema>;
type TraceMetadata = z.infer<typeof TraceMetadataSchema>;
type PromptDenormalizedFields = {
  systemPromptId?: string;
  systemPromptVersion?: number;
  systemPromptHash?: string;
};

export {
  PROMPT_METADATA_KEY,
  TRACE_METADATA_KEY,
  PROMPT_METADATA_HEADER,
  parsePromptMetadataHeader,
  parsePromptMetadataChunk,
  parseTraceMetadataChunk,
  extractPromptFields,
  type PromptMetadata,
  type TraceMetadata,
  type PromptDenormalizedFields,
};
