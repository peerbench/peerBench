import { Prisma } from "@prisma/client";
import { getClient } from "../../helpers";
import type { ResultDetail } from "../../types";
import {
  normalizeResultExplorerRow,
  type RawResultExplorerRow,
} from "./_raw-result-helpers";

export async function getResultById(
  params: GetResultByIdParams
): Promise<ResultDetail | null> {
  const client = getClient(params.tx);

  const rows = await client.$queryRaw<RawResultDetail[]>`
    SELECT
      res.id,
      res.run_id,
      res.test_case_id,
      res.agent_id,
      a.agent_id as agent_name,
      a.name as display_name,
      a.endpoint_url as agent_endpoint_url,
      a.provider as agent_provider,
      res.status,
      res.error_message,
      res.response,
      res.score,
      res.test_case,
      res.score_value,
      res.duration_ms,
      res.ttft_ms,
      res.input_tokens_used,
      res.output_tokens_used,
      res.created_at,
      res.started_at,
      res.completed_at,
      res.system_prompt_id,
      res.system_prompt_version,
      res.system_prompt_hash,
      res.input_cost,
      res.output_cost,
      res.pure_test_case_id,
      r.config_id,
      c.name as config_name,
      r.config_snapshot->>'runner' as runner,
      r.config_snapshot->'scorer'->>'type' as scorer
    FROM tst_results res
    INNER JOIN tst_runs r ON res.run_id = r.id
    LEFT JOIN tst_agents a ON res.agent_id = a.id
    LEFT JOIN tst_configs c ON r.config_id = c.id
    WHERE res.id = ${params.id}::uuid
  `;

  if (rows.length === 0) {
    return null;
  }

  return normalizeResultDetail(rows[0]);
}

function normalizeResultDetail(raw: RawResultDetail): ResultDetail {
  return {
    ...normalizeResultExplorerRow(raw),
    startedAt: raw.started_at ? raw.started_at.toISOString() : null,
    completedAt: raw.completed_at ? raw.completed_at.toISOString() : null,
    systemPromptId: raw.system_prompt_id,
    systemPromptVersion: raw.system_prompt_version,
    systemPromptHash: raw.system_prompt_hash,
    inputCost: raw.input_cost,
    outputCost: raw.output_cost,
    pureTestCaseId: raw.pure_test_case_id,
    agentName: raw.display_name,
  };
}

type RawResultDetail = RawResultExplorerRow & {
  started_at: Date | null;
  completed_at: Date | null;
  system_prompt_id: string | null;
  system_prompt_version: number | null;
  system_prompt_hash: string | null;
  input_cost: string | null;
  output_cost: string | null;
  pure_test_case_id: string | null;
  display_name: string | null;
};

export type GetResultByIdParams = {
  id: string;
  tx?: Prisma.TransactionClient;
};
