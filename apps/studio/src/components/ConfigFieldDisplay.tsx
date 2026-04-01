import { useState } from "react";

const FIELD_DESCRIPTIONS: Record<string, string> = {
  runner:
    "Runner implementation name (must exist in @peerbench/core runner registry).",
  targets:
    "Multiple targets for comparison. Each target specifies its own provider, endpoint, model, and authentication.",
  systemPrompt: "Inline system prompt content.",
  systemPromptFile: "Path to a system prompt file (relative or absolute).",
  systemPromptFiles: "Paths to multiple system prompt files.",
  systemPromptLangfuseName: "Langfuse prompt name (if using Langfuse-managed prompts).",
  systemPromptLangfuseLabel: "Langfuse prompt version/label selector.",
  testCaseFiles: "Test case file paths (.json/.jsonl) or source references.",
  testCasesInline: "Inline test cases as JSON objects.",
  testCasesSchemaKind: "Test case schema kind identifier.",
  supabaseUrl: "Supabase URL (direct value).",
  supabaseApiKey: "Supabase API key (direct value).",
  supabaseMaxFetch: "Max rows to fetch from Supabase.",
  dqSupabaseUrl: "DQ Supabase URL for conversation logs.",
  dqSupabaseKey: "DQ Supabase API key (direct value).",
  dqConversationsFilter: "PostgREST filter string for conversation logs (e.g., 'order=created_at.desc&limit=100').",
  dqConversationsTable: "Table name for conversation logs (default: 'conversation_logs').",
  dqMinScore: "Filter by average_score >= minScore (0-1 scale, default 1.0 for perfect scores).",
  dqTags: "Filter conversations by meta_data.tags.",
  dqTagMode: "Tag matching mode: 'OR' (default) includes ANY tag, 'AND' requires ALL tags.",
  dqMaxMessages: "Filter by messages.length <= maxMessages.",
  dqReviewStatus: "Include only conversations with this review status (prio-high, prio-low, prio-none).",
  dqExcludeReviewStatus: "Exclude conversations with this review status.",
  scorer: "Scorer class name (e.g., LLMAsAJudgeScorer, InsuredQAScorer).",
  scorerModel: "Judge model slug (required for LLMAsAJudgeScorer).",
  scorerPrompt: "Inline judge system prompt content with evaluation instructions.",
  scorerPromptFile: "Path to judge prompt file.",
  scorerEndpoint: "Optional endpoint override for scorer.",
  scorerProvider: "Optional provider override for scorer.",
  scorerApiKey: "Scorer API key (direct value).",
  skipScorer: "Skip scoring even if scorer/scorerModel is provided.",
  scoreLiability: "Whether to score liability field (for insured-qa runner).",
  temperature: "Sampling temperature (0-2). 0 = deterministic, higher = more creative.",
  maxTokens: "Max output tokens.",
  topP: "Nucleus sampling probability (0-1).",
  maxParallel: "Max parallel test case executions.",
  includeConversationHistory:
    "Whether to include full conversation history when supported.",
  tags: "Free-form tags for filtering/grouping runs.",
  description: "Human-readable description.",
  metadata: "Arbitrary metadata.",
  // Target fields
  "target.name": "Display name for the target.",
  "target.provider": "Target provider type (openai, mastra, fetch, fnol-api).",
  "target.endpoint": "Target endpoint URL.",
  "target.model": "Model name (for OpenAI) or agent name (for Mastra).",
  "target.apiKey": "API key (direct value).",
  "target.authBearerToken": "Bearer token (direct value).",
};

const FIELD_GROUPS = [
  {
    title: "Runner",
    fields: ["runner"],
  },
  {
    title: "Targets",
    fields: ["targets"],
  },
  {
    title: "System Prompt",
    fields: [
      "systemPrompt",
      "systemPromptFile",
      "systemPromptFiles",
      "systemPromptLangfuseName",
      "systemPromptLangfuseLabel",
    ],
  },
  {
    title: "Test Cases",
    fields: ["testCasesSchemaKind", "testCaseFiles", "testCasesInline"],
  },
  {
    title: "Scorer",
    fields: [
      "scorer",
      "scorerModel",
      "scorerPrompt",
      "scorerPromptFile",
      "scorerEndpoint",
      "scorerProvider",
      "scorerApiKey",
      "skipScorer",
      "scoreLiability",
    ],
  },
  {
    title: "Model Parameters",
    fields: ["temperature", "maxTokens", "topP"],
  },
  {
    title: "Execution",
    fields: ["maxParallel", "includeConversationHistory"],
  },
  {
    title: "Supabase (InsuredQA)",
    fields: ["supabaseUrl", "supabaseApiKey", "supabaseMaxFetch"],
  },
  {
    title: "DQ Supabase (Conversation Logs)",
    fields: [
      "dqSupabaseUrl",
      "dqSupabaseKey",
      "dqConversationsFilter",
      "dqConversationsTable",
      "dqMinScore",
      "dqTags",
      "dqTagMode",
      "dqMaxMessages",
      "dqReviewStatus",
      "dqExcludeReviewStatus",
    ],
  },
  {
    title: "Metadata",
    fields: ["tags", "description", "metadata"],
  },
];

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block ml-1">
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 focus:outline-none"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {show && (
        <div className="absolute z-10 w-64 p-2 text-xs text-white bg-gray-800 rounded shadow-lg -top-2 left-6">
          {text}
        </div>
      )}
    </div>
  );
}

function FieldValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">not set</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span
        className={`px-2 py-0.5 text-xs rounded ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
      >
        {value ? "true" : "false"}
      </span>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono text-blue-600">{value}</span>;
  }

  if (typeof value === "string") {
    if (value.length > 100) {
      return (
        <span className="font-mono text-sm text-gray-700 break-all">
          {value.slice(0, 100)}...
        </span>
      );
    }
    return <span className="font-mono text-sm text-gray-700">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">empty array</span>;
    }
    // Check if it's an array of primitives (strings/numbers)
    const allPrimitives = value.every(
      (item) => typeof item === "string" || typeof item === "number"
    );
    if (allPrimitives) {
      return (
        <div className="flex flex-col gap-1">
          {value.map((item, idx) => (
            <span
              key={idx}
              className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded"
            >
              {String(item)}
            </span>
          ))}
        </div>
      );
    }
    // For arrays of objects, show count
    return (
      <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
        {value.length} item{value.length !== 1 ? "s" : ""}
      </span>
    );
  }

  if (typeof value === "object") {
    return (
      <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
        object
      </span>
    );
  }

  return <span className="text-gray-700">{String(value)}</span>;
}

function TargetDisplay({
  target,
  index,
}: {
  target: Record<string, unknown>;
  index: number;
}) {
  return (
    <div className="ml-4 p-3 bg-gray-50 rounded border border-gray-200 mb-2">
      <div className="text-xs font-medium text-gray-500 mb-2">
        Target {index + 1}
      </div>
      <div className="space-y-1">
        {[
          "name",
          "provider",
          "endpoint",
          "model",
          "apiKey",
          "authBearerToken",
        ].map((field) => {
          const value = target[field];
          if (value === undefined || value === null || value === "")
            return null;
          const description = FIELD_DESCRIPTIONS[`target.${field}`];
          return (
            <div key={field} className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 min-w-[100px] flex items-center">
                {field}
                {description && <InfoTooltip text={description} />}
              </span>
              <FieldValue
                value={
                  field === "apiKey" || field === "authBearerToken"
                    ? "••••••••"
                    : value
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestCaseFileDisplay({
  file,
  index,
}: {
  file: Record<string, unknown> | string;
  index: number;
}) {
  // Handle string paths
  if (typeof file === "string") {
    return (
      <div className="ml-4 p-2 bg-gray-50 rounded border border-gray-200 mb-2">
        <span className="font-mono text-sm text-gray-700">{file}</span>
      </div>
    );
  }

  // Handle object format (e.g., { source: "supabase", filters: {...} })
  return (
    <div className="ml-4 p-3 bg-gray-50 rounded border border-gray-200 mb-2">
      <div className="text-xs font-medium text-gray-500 mb-2">
        Source {index + 1}
      </div>
      <div className="space-y-1">
        {Object.entries(file).map(([key, val]) => (
          <div key={key} className="flex items-start gap-2 text-sm">
            <span className="text-gray-500 min-w-[80px]">{key}</span>
            {typeof val === "object" && val !== null ? (
              <pre className="font-mono text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded overflow-x-auto">
                {JSON.stringify(val, null, 2)}
              </pre>
            ) : (
              <span className="font-mono text-sm text-gray-700">
                {String(val)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldRow({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  const description = FIELD_DESCRIPTIONS[fieldKey];

  // Handle targets array specially
  if (fieldKey === "targets" && Array.isArray(value)) {
    return (
      <div className="py-2">
        <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
          {fieldKey}
          {description && <InfoTooltip text={description} />}
        </div>
        {value.map((target, idx) => (
          <TargetDisplay
            key={idx}
            target={target as Record<string, unknown>}
            index={idx}
          />
        ))}
      </div>
    );
  }

  // Handle testCaseFiles array specially
  if (fieldKey === "testCaseFiles" && Array.isArray(value)) {
    return (
      <div className="py-2">
        <div className="flex items-center text-sm font-medium text-gray-700 mb-2">
          {fieldKey}
          {description && <InfoTooltip text={description} />}
        </div>
        {value.map((file, idx) => (
          <TestCaseFileDisplay
            key={idx}
            file={file as Record<string, unknown> | string}
            index={idx}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 min-w-[180px] flex items-center">
        {fieldKey}
        {description && <InfoTooltip text={description} />}
      </span>
      <FieldValue value={value} />
    </div>
  );
}

export function ConfigFieldDisplay({
  config,
}: {
  config: Record<string, unknown>;
}) {
  // Get all present fields from config
  const presentFields = new Set(Object.keys(config));

  // Filter groups to only show those with present fields
  const activeGroups = FIELD_GROUPS.map((group) => ({
    ...group,
    presentFields: group.fields.filter((f) => presentFields.has(f)),
  })).filter((group) => group.presentFields.length > 0);

  // Get fields that don't belong to any group
  const groupedFields = new Set(FIELD_GROUPS.flatMap((g) => g.fields));
  const ungroupedFields = Object.keys(config).filter(
    (f) => !groupedFields.has(f)
  );

  return (
    <div className="space-y-4">
      {activeGroups.map((group) => (
        <div
          key={group.title}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              {group.title}
            </h4>
          </div>
          <div className="px-4">
            {group.presentFields.map((field) => (
              <FieldRow key={field} fieldKey={field} value={config[field]} />
            ))}
          </div>
        </div>
      ))}

      {ungroupedFields.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700">
              Other Fields
            </h4>
          </div>
          <div className="px-4">
            {ungroupedFields.map((field) => (
              <FieldRow key={field} fieldKey={field} value={config[field]} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
