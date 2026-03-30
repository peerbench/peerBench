import {
  getBaseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  type KindRendererProps,
} from "../../shared";

export function SingleTurnReferenceComparisonTestCase({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: KindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    {
      key: "dq_conversation_log_id",
      label: "DQ Source",
      type: "dq_link" as const,
      dqLinkType: "conversation" as const,
    },
    { key: "meta_data", label: "Metadata", type: "object" as const },
  ];

  const predefined = [...baseFields, ...kindFields];
  const additional = getAdditionalFields(data, predefined);
  const allFields = buildAllFields(predefined, additional, data);

  const messages = Array.isArray(data.messages)
    ? (data.messages as Array<Record<string, unknown>>)
    : [];
  const userMessages = messages.filter((m) => m.role === "user");
  const expectedAnswers = messages.filter((m) => m.role === "assistant");

  return (
    <div className="space-y-4">
      <FieldGrid
        fields={allFields}
        data={data}
        agentEndpointUrl={agentEndpointUrl}
        agentProvider={agentProvider}
      />

      {userMessages.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 block">
            Messages
          </label>
          <div className="space-y-2">
            {userMessages.map((msg, idx) => (
              <div
                key={idx}
                className="p-3 rounded border bg-blue-50 border-blue-200"
              >
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-800 mb-1 inline-block">
                  user
                </span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mt-1">
                  {String(msg.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {expectedAnswers.length > 0 && (
        <div>
          <label className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 block">
            Expected Answer (Reference)
          </label>
          <div className="space-y-2">
            {expectedAnswers.map((msg, idx) => (
              <div
                key={idx}
                className="p-3 rounded border bg-green-50 border-green-300"
              >
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-100 text-green-800 mb-1 inline-block">
                  Correct Expected Answer
                </span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap break-words mt-1">
                  {String(msg.content)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
