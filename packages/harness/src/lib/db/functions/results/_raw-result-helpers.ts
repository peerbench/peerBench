import { Prisma } from "@prisma/client";
import type { ResultExplorerRow } from "../../types";

export function normalizeResultExplorerRow(
  raw: RawResultExplorerRow
): ResultExplorerRow {
  return {
    id: raw.id,
    runId: raw.run_id,
    testCaseId: raw.test_case_id,
    agentId: raw.agent_id,
    modelSlug: raw.agent_name,
    agentEndpointUrl: raw.agent_endpoint_url,
    agentProvider: raw.agent_provider,
    status: raw.status,
    errorMessage: raw.error_message,
    response: raw.response as Record<string, unknown> | null,
    score: raw.score as Record<string, unknown> | null,
    testCase: raw.test_case as Record<string, unknown> | null,
    scoreValue: raw.score_value,
    durationMs: raw.duration_ms,
    ttftMs: raw.ttft_ms,
    inputTokensUsed: raw.input_tokens_used,
    outputTokensUsed: raw.output_tokens_used,
    createdAt: raw.created_at,
    configId: raw.config_id,
    configName: raw.config_name,
    runner: raw.runner,
    scorer: raw.scorer,
  };
}

export type RawResultExplorerRow = {
  id: string;
  run_id: string;
  test_case_id: string;
  agent_id: string | null;
  agent_name: string | null;
  agent_endpoint_url: string | null;
  agent_provider: string | null;
  status: string;
  error_message: string | null;
  response: Prisma.JsonValue | null;
  score: Prisma.JsonValue | null;
  test_case: Prisma.JsonValue | null;
  score_value: number | null;
  duration_ms: number | null;
  ttft_ms: number | null;
  input_tokens_used: number | null;
  output_tokens_used: number | null;
  created_at: Date;
  config_id: string | null;
  config_name: string | null;
  runner: string | null;
  scorer: string | null;
};
