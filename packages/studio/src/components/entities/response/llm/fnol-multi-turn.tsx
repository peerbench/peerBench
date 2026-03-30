import {
  getBaseFields,
  getCommonResponseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  MultiTurnConversationView,
  ConversationArrayView,
  SimpleRepliesView,
  type ResponseKindRendererProps,
} from "../../shared";

export function FnolMultiTurnResponse({
  data,
  kind,
  version,
  testCaseData,
  agentEndpointUrl,
  agentProvider,
}: ResponseKindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    {
      key: "data",
      label: "Data",
      type: "text" as const,
      skip: !!data.replies,
    },
  ];

  const predefined = [
    ...baseFields,
    ...kindFields,
    ...getCommonResponseFields(),
  ];
  const additional = getAdditionalFields(data, predefined);
  const allFields = buildAllFields(predefined, additional, data);

  const replies = Array.isArray(data.replies) ? data.replies : [];
  const testCaseMessages =
    testCaseData && Array.isArray(testCaseData.messages)
      ? testCaseData.messages
      : [];
  const conversationArray =
    Array.isArray(data.conversation) && data.conversation.length > 0
      ? (data.conversation as Array<Record<string, unknown>>)
      : null;

  const hasMultiTurn = replies.length > 0 && testCaseMessages.length > 0;

  return (
    <div className="space-y-4">
      <FieldGrid
        fields={allFields}
        data={data}
        agentEndpointUrl={agentEndpointUrl}
        agentProvider={agentProvider}
        isResponse
      />
      {hasMultiTurn ? (
        <MultiTurnConversationView
          replies={replies}
          testCaseMessages={testCaseMessages}
        />
      ) : conversationArray ? (
        <ConversationArrayView conversation={conversationArray} />
      ) : (
        <SimpleRepliesView replies={replies} />
      )}
    </div>
  );
}
