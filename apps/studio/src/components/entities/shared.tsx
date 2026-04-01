import { ReadMoreText } from "@/components/ui/ReadMoreText";
import { JsonView, defaultStyles } from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";
import { AgentName } from "@/components/AgentName";
import { toastSuccess, toastError } from "@/lib/toast";
import { Button } from "@/components/ui/button";

export function getKindAndVersion(data: Record<string, unknown>): {
  kind: string | null;
  version: number | null;
} {
  const kind = typeof data.kind === "string" ? data.kind : null;
  const version =
    typeof data.version === "number"
      ? data.version
      : typeof data.schemaVersion === "number"
        ? data.schemaVersion
        : null;
  return { kind, version };
}

export function formatStopReasonForDisplay(value: unknown): string {
  if (value == null) return "—";
  const s = String(value).toLowerCase();
  if (s === "stagnation_detected" || s.includes("stagnation")) {
    return "Agent stuck in a loop";
  }
  if (s === "workflow_completed" || s.includes("workflow_completed")) {
    return "Conversation ended naturally";
  }
  return String(value);
}

export async function copyConversationAsJson(
  conversation: Array<{
    role: string;
    content: string;
    intentClassification?: { field: string; confidence?: string };
  }>
) {
  try {
    const json = JSON.stringify(conversation, null, 2);
    await navigator.clipboard.writeText(json);
    toastSuccess("Conversation copied as JSON");
  } catch {
    toastError(new Error("Failed to copy"), "Could not copy to clipboard");
  }
}

export function getBaseFields(
  data: Record<string, unknown>,
  kind: string | null,
  version: number | null
): FieldDefinition[] {
  const fields: FieldDefinition[] = [];
  if (data.id) fields.push({ key: "id", label: "ID", type: "code" });
  if (data.namespace)
    fields.push({ key: "namespace", label: "Namespace", type: "code" });
  if (kind) fields.push({ key: "kind", label: "Kind", type: "code" });
  if (version !== null)
    fields.push({ key: "version", label: "Version", type: "text" });
  return fields;
}

export function getCommonResponseFields(): FieldDefinition[] {
  return [
    { key: "testCaseId", label: "Test Case ID", type: "code" },
    { key: "modelSlug", label: "Model", type: "code" },
    { key: "provider", label: "Provider", type: "badge", badgeColor: "blue" },
    { key: "systemPromptId", label: "System Prompt ID", type: "code" },
    { key: "startedAt", label: "Started At", type: "timestamp" },
    { key: "completedAt", label: "Completed At", type: "timestamp" },
    { key: "inputTokensUsed", label: "Input Tokens", type: "text" },
    { key: "outputTokensUsed", label: "Output Tokens", type: "text" },
    { key: "inputCost", label: "Input Cost", type: "currency" },
    { key: "outputCost", label: "Output Cost", type: "currency" },
  ];
}

export function getCommonScoreFields(): FieldDefinition[] {
  return [
    { key: "responseId", label: "Response ID", type: "code" },
    {
      key: "scoringMethod",
      label: "Scoring Method",
      type: "badge",
      badgeColor: "yellow",
    },
    { key: "scorerAIModelSlug", label: "Scorer Model", type: "code" },
    {
      key: "scorerAIProvider",
      label: "Scorer Provider",
      type: "badge",
      badgeColor: "blue",
    },
    {
      key: "scorerAIInputTokensUsed",
      label: "Scorer Input Tokens",
      type: "text",
    },
    {
      key: "scorerAIOutputTokensUsed",
      label: "Scorer Output Tokens",
      type: "text",
    },
    {
      key: "scorerAIInputCost",
      label: "Scorer Input Cost",
      type: "currency",
    },
    {
      key: "scorerAIOutputCost",
      label: "Scorer Output Cost",
      type: "currency",
    },
    {
      key: "scorerAISystemPromptId",
      label: "Scorer System Prompt ID",
      type: "code",
    },
  ];
}

export function getAdditionalFields(
  data: Record<string, unknown>,
  predefinedFields: FieldDefinition[],
  extraExcludeKeys: string[] = []
): FieldDefinition[] {
  const predefinedKeys = new Set(
    predefinedFields.filter((f) => !f.skip).map((f) => f.key)
  );
  const excludeKeys = new Set([
    "kind",
    "version",
    "schemaVersion",
    "namespace",
    "id",
    "metadata",
    "messages",
    "replies",
    "conversation",
    ...extraExcludeKeys,
  ]);

  const additional: FieldDefinition[] = [];

  for (const key in data) {
    if (
      excludeKeys.has(key) ||
      (predefinedKeys.has(key) && key !== "metadata") ||
      data[key] === null ||
      data[key] === undefined
    ) {
      continue;
    }

    let fieldType: FieldType = "text";
    if (typeof data[key] === "number") {
      const num = data[key] as number;
      if (num >= 0 && num <= 1 && num.toString().includes(".")) {
        fieldType = "score";
      } else if (num > 1000000000000) {
        fieldType = "timestamp";
      }
    } else if (Array.isArray(data[key])) {
      fieldType = "list";
    } else if (typeof data[key] === "object" && data[key] !== null) {
      fieldType = "object";
    } else if (typeof data[key] === "string" && data[key].length < 50) {
      if (
        /^[a-f0-9-]{20,}$/i.test(data[key] as string) ||
        data[key]?.toString().includes("://")
      ) {
        fieldType = "code";
      }
    }

    const isLong =
      typeof data[key] === "string" && (data[key] as string).length > 200;
    additional.push({
      key,
      label: key
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim(),
      type: fieldType,
      isLongText: isLong,
    });
  }

  return additional;
}

export function buildAllFields(
  predefinedFields: FieldDefinition[],
  additionalFields: FieldDefinition[],
  data: Record<string, unknown>
): FieldDefinition[] {
  const allFields = [
    ...predefinedFields.filter(
      (f) => !f.skip && data[f.key] !== undefined && f.key !== "metadata"
    ),
    ...additionalFields.filter(
      (f) => data[f.key] !== undefined && f.key !== "metadata"
    ),
  ];

  if (data.metadata !== undefined && data.metadata !== null) {
    allFields.push({
      key: "metadata",
      label: "Metadata",
      type: "object",
      isLongText: true,
    });
  }

  return allFields;
}

export function FieldRenderer({
  label,
  value,
  type = "text",
  badgeColor = "gray",
  isLongText = false,
  dqLinkType,
  fieldKey,
  agentEndpointUrl,
  agentProvider,
}: FieldRendererProps) {
  if (value === null || value === undefined) {
    return null;
  }

  const renderValue = () => {
    switch (type) {
      case "score":
        if (typeof value === "number") {
          const pct = value > 1 ? value : value * 100;
          const colorClass =
            pct >= 90
              ? "text-green-600"
              : pct >= 75
                ? "text-blue-600"
                : pct >= 50
                  ? "text-yellow-600"
                  : "text-red-600";
          return (
            <span className={`text-lg font-bold ${colorClass}`}>
              {pct.toFixed(1)}%
            </span>
          );
        }
        return <span className="text-sm text-gray-500">—</span>;

      case "badge": {
        const badgeColors = {
          blue: "bg-blue-100 text-blue-800",
          green: "bg-green-100 text-green-800",
          yellow: "bg-yellow-100 text-yellow-800",
          red: "bg-red-100 text-red-800",
          gray: "bg-gray-100 text-gray-800",
        };
        return (
          <span
            className={`inline-block max-w-full break-words px-2 py-1 text-xs font-medium rounded ${badgeColors[badgeColor]}`}
          >
            {String(value)}
          </span>
        );
      }

      case "code": {
        const codeValue = String(value);
        if (fieldKey === "modelSlug" && (agentEndpointUrl || agentProvider)) {
          return (
            <AgentName
              name={codeValue}
              provider={agentProvider}
              endpointUrl={agentEndpointUrl}
              className="text-xs font-mono bg-gray-100 px-2 py-1 rounded"
            />
          );
        }
        return (
          <code className="block max-w-full break-all text-xs font-mono bg-gray-100 px-2 py-1 rounded">
            {codeValue}
          </code>
        );
      }

      case "list":
        if (Array.isArray(value)) {
          if (value.length === 0)
            return <span className="text-sm text-gray-400">Empty</span>;
          return (
            <div className="space-y-1">
              {value.map((item, idx) => (
                <div
                  key={idx}
                  className="text-sm text-gray-700 bg-gray-50 px-2 py-1 rounded"
                >
                  {typeof item === "object"
                    ? JSON.stringify(item, null, 2)
                    : String(item)}
                </div>
              ))}
            </div>
          );
        }
        return <span className="text-sm text-gray-500">—</span>;

      case "object":
        return (
          <div className="bg-gray-50 p-2 rounded border">
            <JsonView
              data={value}
              shouldExpandNode={() => false}
              style={{
                ...defaultStyles,
                container: "text-xs font-mono",
              }}
            />
          </div>
        );

      case "timestamp":
        if (typeof value === "number" || typeof value === "string") {
          try {
            const date = new Date(value);
            return (
              <span className="text-sm text-gray-700">
                {date.toLocaleString()}
              </span>
            );
          } catch {
            return (
              <span className="text-sm text-gray-500">{String(value)}</span>
            );
          }
        }
        return <span className="text-sm text-gray-500">—</span>;

      case "currency":
        if (typeof value === "string") {
          const num = parseFloat(value);
          if (!isNaN(num)) {
            return (
              <span className="text-sm font-medium text-gray-700">
                ${num.toFixed(4)}
              </span>
            );
          }
        }
        return <span className="text-sm text-gray-500">{String(value)}</span>;

      case "dq_link":
        if (typeof value === "string" && value) {
          const dqBaseUrl =
            "https://dev-simple-question-data-quality-delta.vercel.app";
          const url =
            dqLinkType === "conversation"
              ? `${dqBaseUrl}/conversations/logs/${value}`
              : `${dqBaseUrl}/question/${value}`;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View in DQ
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          );
        }
        return <span className="text-sm text-gray-500">-</span>;

      case "text":
      default: {
        const str = String(value);
        return <ReadMoreText text={str} maxLength={200} />;
      }
    }
  };

  const isLongField =
    isLongText ||
    (type === "text" && typeof value === "string" && value.length > 200);

  return (
    <div
      className={`min-w-0 space-y-2 py-3 border-b border-gray-100 last:border-b-0 ${
        isLongField ? "col-span-1 sm:col-span-2 lg:col-span-3" : ""
      }`}
    >
      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-1">
        {label}
      </label>
      <div className="min-h-[1.5rem] break-words min-w-0">{renderValue()}</div>
    </div>
  );
}

export function FieldGrid({
  fields,
  data,
  agentEndpointUrl,
  agentProvider,
  isResponse = false,
}: FieldGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {fields.map((field, idx) => (
        <FieldRenderer
          key={`${field.key}-${idx}`}
          label={field.label}
          value={
            isResponse && field.key === "stopReason"
              ? formatStopReasonForDisplay(data[field.key])
              : data[field.key]
          }
          type={field.type}
          badgeColor={field.badgeColor}
          isLongText={field.isLongText}
          dqLinkType={field.dqLinkType}
          fieldKey={field.key}
          agentEndpointUrl={agentEndpointUrl}
          agentProvider={agentProvider}
        />
      ))}
    </div>
  );
}

export function MessagesView({ messages }: MessagesViewProps) {
  if (messages.length === 0) return null;

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
        Messages
      </label>
      <div className="space-y-2">
        {messages.map((msg: unknown, idx: number) => {
          if (
            typeof msg === "object" &&
            msg !== null &&
            "role" in msg &&
            "content" in msg
          ) {
            const msgObj = msg as Record<string, unknown>;
            const role = String(msgObj.role);
            const content = String(msgObj.content);
            const isUser = role === "user";
            const goodAnswers = Array.isArray(msgObj.good_answers)
              ? msgObj.good_answers
              : Array.isArray(msgObj.goodAnswers)
                ? msgObj.goodAnswers
                : null;
            const badAnswers = Array.isArray(msgObj.bad_answers)
              ? msgObj.bad_answers
              : Array.isArray(msgObj.badAnswers)
                ? msgObj.badAnswers
                : null;

            return (
              <div
                key={idx}
                className={`p-3 rounded border ${
                  isUser
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      isUser
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {role}
                  </span>
                  {typeof msgObj.messageIndex === "number" && (
                    <span className="text-xs text-gray-500">
                      Index: {msgObj.messageIndex}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mb-2">
                  {content}
                </p>
                {(goodAnswers || badAnswers) && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-gray-200">
                    {goodAnswers && goodAnswers.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-green-700 mr-2">
                          Good Answers:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {goodAnswers.map((answer: unknown, aidx: number) => (
                            <span
                              key={aidx}
                              className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded"
                            >
                              {String(answer)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {badAnswers && badAnswers.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-red-700 mr-2">
                          Bad Answers:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badAnswers.map((answer: unknown, aidx: number) => (
                            <span
                              key={aidx}
                              className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded"
                            >
                              {String(answer)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export function MultiTurnConversationView({
  replies,
  testCaseMessages,
}: MultiTurnConversationViewProps) {
  const repliesByIndex = new Map<number, Record<string, unknown>>();
  for (const reply of replies) {
    if (typeof reply === "object" && reply !== null) {
      const replyObj = reply as Record<string, unknown>;
      const index =
        typeof replyObj.messageIndex === "number"
          ? replyObj.messageIndex
          : typeof replyObj.userMessageIndex === "number"
            ? replyObj.userMessageIndex
            : null;
      if (index !== null) {
        repliesByIndex.set(index, replyObj);
      }
    }
  }

  const conversationItems: ConversationItem[] = [];
  let userMessageIndex = 0;

  for (const msg of testCaseMessages) {
    if (
      typeof msg !== "object" ||
      msg === null ||
      !("role" in msg) ||
      !("content" in msg)
    ) {
      continue;
    }

    const msgObj = msg as Record<string, unknown>;
    const role = String(msgObj.role);
    const content = String(msgObj.content);

    if (role === "user") {
      conversationItems.push({
        type: "user",
        content,
        isFromTestCase: true,
        messageData: msgObj,
      });

      const reply = repliesByIndex.get(userMessageIndex);
      if (reply) {
        const replyContent =
          typeof reply.data === "string"
            ? reply.data
            : typeof reply.content === "string"
              ? reply.content
              : "";
        if (replyContent) {
          conversationItems.push({
            type: "assistant",
            content: replyContent,
            isFromTestCase: false,
            replyData: reply,
          });
        }
      }
      userMessageIndex++;
    }
  }

  if (conversationItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">
          Conversation
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() =>
            copyConversationAsJson(
              conversationItems.map((item) => ({
                role: item.type === "user" ? "user" : "assistant",
                content: item.content,
              }))
            )
          }
        >
          Copy conversation (JSON)
        </Button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Agent replies on the left, customer messages on the right.
      </p>
      <div className="space-y-4">
        {conversationItems.map((item, idx) => {
          const isUser = item.type === "user";
          const messageData = item.messageData;
          const goodAnswers =
            messageData &&
            (Array.isArray(messageData.good_answers)
              ? messageData.good_answers
              : Array.isArray(messageData.goodAnswers)
                ? messageData.goodAnswers
                : null);
          const badAnswers =
            messageData &&
            (Array.isArray(messageData.bad_answers)
              ? messageData.bad_answers
              : Array.isArray(messageData.badAnswers)
                ? messageData.badAnswers
                : null);

          return (
            <div
              key={idx}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                  isUser
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isUser
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isUser ? "Customer" : "Agent"}
                  </span>
                  {item.isFromTestCase && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg
                        className="w-3.5 h-3.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      from test case
                    </span>
                  )}
                  {item.replyData &&
                    typeof item.replyData === "object" &&
                    "startedAt" in item.replyData &&
                    "completedAt" in item.replyData && (
                      <span className="text-xs text-gray-500">
                        Response time:{" "}
                        {Number(item.replyData.completedAt) -
                          Number(item.replyData.startedAt)}
                        ms
                      </span>
                    )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mb-2">
                  {item.content}
                </p>
                {(goodAnswers || badAnswers) && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-gray-300">
                    {goodAnswers && goodAnswers.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-green-700 mr-2">
                          Good Answers:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {goodAnswers.map((answer: unknown, aidx: number) => (
                            <span
                              key={aidx}
                              className="text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded"
                            >
                              {String(answer)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {badAnswers && badAnswers.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-red-700 mr-2">
                          Bad Answers:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {badAnswers.map((answer: unknown, aidx: number) => (
                            <span
                              key={aidx}
                              className="text-xs px-2 py-0.5 bg-red-100 text-red-800 rounded"
                            >
                              {String(answer)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConversationArrayView({
  conversation,
}: ConversationArrayViewProps) {
  const conversationItems: ConversationArrayItem[] = [];

  for (const msg of conversation) {
    if (
      typeof msg !== "object" ||
      msg === null ||
      !("role" in msg) ||
      !("content" in msg)
    ) {
      continue;
    }

    const role = String(msg.role);
    const content = String(msg.content);
    const metadata = msg.metadata as Record<string, unknown> | undefined;
    const intentClassification =
      metadata &&
      typeof metadata.intentClassification === "object" &&
      metadata.intentClassification !== null &&
      "field" in metadata.intentClassification
        ? {
            field: String(
              (metadata.intentClassification as Record<string, unknown>).field
            ),
            confidence:
              (metadata.intentClassification as Record<string, unknown>)
                .confidence != null
                ? String(
                    (metadata.intentClassification as Record<string, unknown>)
                      .confidence
                  )
                : undefined,
          }
        : undefined;

    if (role === "user") {
      conversationItems.push({
        type: "user",
        content,
        intentClassification,
      });
    } else if (role === "agent" || role === "assistant") {
      conversationItems.push({ type: "assistant", content });
    }
  }

  if (conversationItems.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide block">
          Conversation
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() =>
            copyConversationAsJson(
              conversationItems.map((item) => ({
                role: item.type === "user" ? "user" : "assistant",
                content: item.content,
                ...(item.type === "user" &&
                  item.intentClassification != null && {
                    intentClassification: item.intentClassification,
                  }),
              }))
            )
          }
        >
          Copy conversation (JSON)
        </Button>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Agent replies on the left, customer messages on the right.
      </p>
      <div className="space-y-4">
        {conversationItems.map((item, idx) => {
          const isUser = item.type === "user";
          return (
            <div
              key={idx}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-xl p-4 shadow-sm ${
                  isUser
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-green-50 border border-green-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isUser
                        ? "bg-blue-100 text-blue-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {isUser ? "Customer" : "Agent"}
                  </span>
                  {isUser &&
                    item.intentClassification != null &&
                    item.intentClassification.field != null && (
                      <span
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded border border-gray-300"
                        title={
                          item.intentClassification.confidence != null
                            ? `Intent: ${item.intentClassification.field} (confidence: ${item.intentClassification.confidence})`
                            : `Intent: ${item.intentClassification.field}`
                        }
                      >
                        {item.intentClassification.field}
                      </span>
                    )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mb-2">
                  {item.content}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SimpleRepliesView({ replies }: SimpleRepliesViewProps) {
  if (replies.length === 0) return null;

  return (
    <div>
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
        Replies
      </label>
      <div className="space-y-2">
        {replies.map((reply: unknown, idx: number) => {
          if (
            typeof reply === "object" &&
            reply !== null &&
            "content" in reply
          ) {
            const content = String(reply.content);
            const userMessageIndex =
              typeof reply === "object" &&
              reply !== null &&
              "userMessageIndex" in reply
                ? reply.userMessageIndex
                : idx;
            return (
              <div
                key={idx}
                className="bg-green-50 border border-green-200 p-3 rounded"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800">
                    Reply {Number(userMessageIndex) + 1}
                  </span>
                  {typeof reply === "object" &&
                    reply !== null &&
                    "startedAt" in reply &&
                    "completedAt" in reply && (
                      <span className="text-xs text-gray-500">
                        {Number(reply.completedAt) - Number(reply.startedAt)}
                        ms
                      </span>
                    )}
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {content}
                </p>
              </div>
            );
          }
          return (
            <div
              key={idx}
              className="bg-gray-50 border border-gray-200 p-3 rounded text-sm"
            >
              {typeof reply === "string" ? reply : JSON.stringify(reply)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type FieldType =
  | "text"
  | "score"
  | "badge"
  | "code"
  | "list"
  | "object"
  | "timestamp"
  | "currency"
  | "dq_link";

export interface FieldDefinition {
  key: string;
  label: string;
  type?: FieldType;
  badgeColor?: "blue" | "green" | "yellow" | "red" | "gray";
  skip?: boolean;
  isLongText?: boolean;
  dqLinkType?: "conversation" | "question";
}

export interface FieldRendererProps {
  label: string;
  value: unknown;
  type?: FieldType;
  badgeColor?: "blue" | "green" | "yellow" | "red" | "gray";
  isLongText?: boolean;
  dqLinkType?: "conversation" | "question";
  fieldKey?: string;
  agentEndpointUrl?: string | null;
  agentProvider?: string | null;
}

export interface FieldGridProps {
  fields: FieldDefinition[];
  data: Record<string, unknown>;
  agentEndpointUrl?: string | null;
  agentProvider?: string | null;
  isResponse?: boolean;
}

export interface KindRendererProps {
  data: Record<string, unknown>;
  kind: string | null;
  version: number | null;
  agentEndpointUrl?: string | null;
  agentProvider?: string | null;
}

export interface ResponseKindRendererProps extends KindRendererProps {
  testCaseData?: Record<string, unknown> | null;
}

interface MessagesViewProps {
  messages: unknown[];
}

interface MultiTurnConversationViewProps {
  replies: unknown[];
  testCaseMessages: unknown[];
}

interface ConversationArrayViewProps {
  conversation: Array<Record<string, unknown>>;
}

interface SimpleRepliesViewProps {
  replies: unknown[];
}

interface ConversationItem {
  type: "user" | "assistant";
  content: string;
  isFromTestCase: boolean;
  replyData?: Record<string, unknown>;
  messageData?: Record<string, unknown>;
}

interface ConversationArrayItem {
  type: "user" | "assistant";
  content: string;
  intentClassification?: { field: string; confidence?: string };
}
