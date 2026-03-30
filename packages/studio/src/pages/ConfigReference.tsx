import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExpandableCard } from "@/components/ui/ExpandableCard";

interface FieldDoc {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example?: string;
}

interface FieldGroup {
  title: string;
  description: string;
  fields: FieldDoc[];
}

const CONFIG_REFERENCE: FieldGroup[] = [
  {
    title: "Runner",
    description: "Select which runner implementation to use for test execution.",
    fields: [
      {
        name: "runner",
        type: "string",
        required: true,
        description:
          "Runner implementation name. Must match a registered runner in @peerbench/core.",
        example: '"single-turn-reference-comparison"',
      },
    ],
  },
  {
    title: "Targets",
    description:
      "Configure one or more AI targets to test. Each target specifies its provider, endpoint, model, and authentication.",
    fields: [
      {
        name: "targets",
        type: "array",
        required: true,
        description:
          "Array of target configurations. Each target is tested independently, allowing comparison across models/endpoints.",
        example: `[{
  "provider": "mastra",
  "endpoint_ENV": "MASTRA_ENDPOINT",
  "authBearerToken_ENV": "MASTRA_BEARER_TOKEN",
  "model": "fnolAgentLite"
}]`,
      },
      {
        name: "targets[].provider",
        type: '"openai" | "mastra" | "fetch" | "fnol-api"',
        required: true,
        description:
          "Provider type. Use 'openai' for OpenAI-compatible APIs, 'mastra' for Mastra agents, 'fetch' for raw HTTP, 'fnol-api' for FNOL API.",
      },
      {
        name: "targets[].endpoint",
        type: "string (URL)",
        description: "Target endpoint URL. Can also use endpoint_ENV for environment variable.",
      },
      {
        name: "targets[].endpoint_ENV",
        type: "string",
        description: "Environment variable name containing the endpoint URL.",
        example: '"MASTRA_ENDPOINT"',
      },
      {
        name: "targets[].model",
        type: "string",
        required: true,
        description:
          "Model identifier. For Mastra, this is the agent name. For OpenAI-compatible, this is the model slug.",
        example: '"fnolAgentLite" or "gpt-4o"',
      },
      {
        name: "targets[].apiKey_ENV",
        type: "string",
        description: "Environment variable name containing the API key.",
        example: '"OPENAI_API_KEY"',
      },
      {
        name: "targets[].authBearerToken_ENV",
        type: "string",
        description: "Environment variable name containing a bearer token for authentication.",
        example: '"MASTRA_BEARER_TOKEN"',
      },
    ],
  },
  {
    title: "Test Cases",
    description: "Configure where to load test cases from.",
    fields: [
      {
        name: "testCasesSchemaKind",
        type: "string",
        required: true,
        description:
          "Schema kind for test cases. Must match the runner's expected schema.",
        example: '"llm/single-turn-reference-comparison.tc"',
      },
      {
        name: "testCaseFiles",
        type: "array",
        description:
          "Array of test case sources. Can be file paths (.json/.jsonl) or source objects with filters.",
        example: `[
  "path/to/testcases.json",
  { "source": "supabase", "filters": { "acceptedUserId": "..." } }
]`,
      },
      {
        name: "testCasesInline",
        type: "array",
        description: "Inline test cases as JSON objects. Useful for quick testing.",
      },
    ],
  },
  {
    title: "Test Case Sources - Supabase (InsuredQA)",
    description:
      "Load InsuredQA test cases from Supabase questions table. Use testCaseFiles with source: 'supabase'.",
    fields: [
      {
        name: "supabaseUrl_ENV",
        type: "string",
        description: "Environment variable containing Supabase URL.",
        example: '"SUPABASE_URL"',
      },
      {
        name: "supabaseApiKey_ENV",
        type: "string",
        description: "Environment variable containing Supabase service role key.",
        example: '"SUPABASE_SERVICE_ROLE_KEY"',
      },
      {
        name: "supabaseMaxFetch",
        type: "number",
        description: "Maximum number of rows to fetch from Supabase.",
        example: "100",
      },
      {
        name: "testCaseFiles[].filters.acceptedUserId",
        type: "string (UUID)",
        description:
          "Filter questions by a specific user's accepted answers. Use this to get 'source of truth' answers from a trusted user.",
        example: '"aa26f39d-d385-4ebb-b8d0-7bdf923aa24f"',
      },
      {
        name: "testCaseFiles[].filters.maxQuestions",
        type: "number",
        description: "Limit number of questions to load.",
        example: "50",
      },
    ],
  },
  {
    title: "Test Case Sources - DQ Supabase (Conversation Logs)",
    description:
      "Load test cases from DQ (Data Quality) Supabase conversation_logs table. Used for single-turn-reference-comparison.",
    fields: [
      {
        name: "dqSupabaseUrl_ENV",
        type: "string",
        description: "Environment variable containing DQ Supabase URL.",
        example: '"DQ_SUPABASE_URL"',
      },
      {
        name: "dqSupabaseKey_ENV",
        type: "string",
        description: "Environment variable containing DQ Supabase API key.",
        example: '"DQ_SUPABASE_KEY"',
      },
      {
        name: "dqConversationsFilter",
        type: "string",
        description:
          "PostgREST filter string for querying conversation_logs. Supports ordering and limits.",
        example: '"order=created_at.desc&limit=1000"',
      },
      {
        name: "dqConversationsTable",
        type: "string",
        description: 'Table name for conversation logs. Defaults to "conversation_logs".',
      },
      {
        name: "dqTags",
        type: "array of strings",
        description:
          "Filter conversations by meta_data.tags. Only includes conversations that have these tags.",
        example: '["1q-fnol", "insurance"]',
      },
      {
        name: "dqTagMode",
        type: '"AND" | "OR"',
        description:
          'Tag matching mode. "OR" (default) includes conversations with ANY of the tags. "AND" requires ALL tags.',
        example: '"OR"',
      },
      {
        name: "dqMaxMessages",
        type: "number",
        description:
          "Filter by conversation length. Only includes conversations with messages.length <= this value.",
        example: "2",
      },
      {
        name: "dqMinScore",
        type: "number (0-1)",
        description:
          "Filter by quality score. Only includes conversations with average_score >= this value. Default 1.0 (perfect scores only).",
        example: "0.8",
      },
      {
        name: "dqReviewStatus",
        type: '"prio-high" | "prio-low" | "prio-none"',
        description: "Include only conversations with this review status.",
        example: '"prio-high"',
      },
      {
        name: "dqExcludeReviewStatus",
        type: '"prio-high" | "prio-low" | "prio-none"',
        description: "Exclude conversations with this review status.",
        example: '"prio-none"',
      },
    ],
  },
  {
    title: "System Prompt",
    description: "Configure the system prompt for the target AI. Not needed for Mastra agents which have baked-in prompts.",
    fields: [
      {
        name: "systemPrompt",
        type: "string",
        description: "Inline system prompt content.",
      },
      {
        name: "systemPromptFile",
        type: "string",
        description: "Path to a system prompt file (relative or absolute).",
        example: '"prompts/fnol-agent.txt"',
      },
      {
        name: "systemPromptFiles",
        type: "array of strings",
        description:
          "Paths to multiple system prompt files. Creates a matrix run with each prompt.",
      },
      {
        name: "systemPromptLangfuseName",
        type: "string",
        description: "Langfuse prompt name (if using Langfuse-managed prompts).",
      },
      {
        name: "systemPromptLangfuseLabel",
        type: "string",
        description: "Langfuse prompt version/label selector.",
        example: '"production"',
      },
    ],
  },
  {
    title: "Scorer Configuration",
    description: "Configure how responses are scored.",
    fields: [
      {
        name: "scorer",
        type: "string",
        required: true,
        description:
          "Scorer class name. Common options: LLMAsAJudgeScorer, InsuredQAScorer.",
        example: '"LLMAsAJudgeScorer"',
      },
      {
        name: "scorerModel",
        type: "string",
        description:
          "Model slug for the LLM judge (required for LLMAsAJudgeScorer).",
        example: '"google/gemini-2.5-flash-lite"',
      },
      {
        name: "scorerPrompt",
        type: "string",
        description: "Inline judge system prompt content with evaluation instructions.",
      },
      {
        name: "scorerPromptFile",
        type: "string",
        description: "Path to judge prompt file.",
      },
      {
        name: "scorerProvider",
        type: "string",
        description: "Optional provider override for scorer (defaults to target provider).",
        example: '"openai"',
      },
      {
        name: "scorerEndpoint",
        type: "string (URL)",
        description: "Optional endpoint override for scorer.",
        example: '"https://openrouter.ai/api/v1"',
      },
      {
        name: "scorerApiKey_ENV",
        type: "string",
        description: "Environment variable containing scorer API key.",
        example: '"OPENROUTER_KEY"',
      },
      {
        name: "skipScorer",
        type: "boolean",
        description: "Skip scoring even if scorer is configured. Useful for response-only runs.",
      },
      {
        name: "scoreLiability",
        type: "boolean",
        description:
          "Whether to also score liability determination (for insured-qa runner only).",
      },
    ],
  },
  {
    title: "Model Parameters",
    description: "Control generation behavior for the target AI.",
    fields: [
      {
        name: "temperature",
        type: "number (0-2)",
        description:
          "Sampling temperature. 0 = deterministic, higher = more creative/random.",
        example: "0",
      },
      {
        name: "maxTokens",
        type: "number",
        description: "Maximum output tokens.",
        example: "1024",
      },
      {
        name: "topP",
        type: "number (0-1)",
        description: "Nucleus sampling probability.",
        example: "0.9",
      },
    ],
  },
  {
    title: "Execution Settings",
    description: "Control how runs are executed.",
    fields: [
      {
        name: "maxParallel",
        type: "number",
        description:
          "Maximum parallel test case executions. Higher = faster but more API load.",
        example: "5",
      },
      {
        name: "includeConversationHistory",
        type: "boolean",
        description: "Whether to include full conversation history in multi-turn runners.",
      },
    ],
  },
  {
    title: "Metadata",
    description: "Add metadata for organization and filtering.",
    fields: [
      {
        name: "tags",
        type: "array of strings",
        description: "Free-form tags for filtering and grouping runs.",
        example: '["production", "regression-test"]',
      },
      {
        name: "description",
        type: "string",
        description: "Human-readable description of this configuration.",
      },
      {
        name: "metadata",
        type: "object",
        description: "Arbitrary key-value metadata.",
      },
    ],
  },
];

function FieldCard({ field }: { field: FieldDoc }) {
  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex items-start gap-3">
        <code className="text-sm font-semibold bg-muted px-2 py-0.5 rounded">
          {field.name}
        </code>
        <span className="px-2 py-0.5 text-xs font-mono bg-blue-50 text-blue-700 rounded">
          {field.type}
        </span>
        {field.required && (
          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
            required
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-2">{field.description}</p>
      {field.example && (
        <div className="mt-2">
          <span className="text-xs text-muted-foreground">Example: </span>
          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {field.example}
          </code>
        </div>
      )}
    </div>
  );
}


export function ConfigReference() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(CONFIG_REFERENCE.map((g) => g.title)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuration Reference</h1>
        <p className="text-muted-foreground mt-1">
          Complete reference for all run configuration options. Click each section to expand.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          About Run Configurations
        </h3>
        <p className="text-sm text-blue-800">
          A run configuration is a JSON file that defines how to execute benchmark tests.
          It specifies which runner to use, what targets to test against, where to load
          test cases from, and how to score responses. Configurations can be saved and
          reused across multiple runs.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={expandAll}>
          Expand All
        </Button>
        <Button variant="ghost" size="sm" onClick={collapseAll}>
          Collapse All
        </Button>
      </div>

      <div className="space-y-4">
        {CONFIG_REFERENCE.map((group) => (
          <ExpandableCard
            key={group.title}
            isExpanded={expandedGroups.has(group.title)}
            onToggle={() => toggleGroup(group.title)}
            header={
              <h3 className="text-lg font-semibold">{group.title}</h3>
            }
            description={group.description}
            headerRight={
              <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded">
                {group.fields.length} field
                {group.fields.length !== 1 ? "s" : ""}
              </span>
            }
          >
            <div className="mt-4">
              {group.fields.map((field) => (
                <FieldCard key={field.name} field={field} />
              ))}
            </div>
          </ExpandableCard>
        ))}
      </div>

      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-2">Example Configuration</h3>
        <pre className="text-xs overflow-x-auto bg-muted p-3 rounded border border-border">
{`{
  "runner": "single-turn-reference-comparison",
  "testCasesSchemaKind": "llm/single-turn-reference-comparison.tc",
  "targets": [
    {
      "provider": "mastra",
      "endpoint_ENV": "MASTRA_ENDPOINT",
      "authBearerToken_ENV": "MASTRA_BEARER_TOKEN",
      "model": "fnolAgentLite"
    }
  ],
  "temperature": 0,
  "scorer": "LLMAsAJudgeScorer",
  "scorerProvider": "openai",
  "scorerEndpoint": "https://openrouter.ai/api/v1",
  "scorerModel": "google/gemini-2.5-flash-lite",
  "scorerApiKey_ENV": "OPENROUTER_KEY",
  "dqSupabaseUrl_ENV": "DQ_SUPABASE_URL",
  "dqSupabaseKey_ENV": "DQ_SUPABASE_KEY",
  "dqConversationsFilter": "order=created_at.desc&limit=100",
  "dqTags": ["1q-fnol"],
  "dqMaxMessages": 2,
  "tags": ["single-turn", "dq-supabase"]
}`}
        </pre>
      </Card>
    </div>
  );
}
