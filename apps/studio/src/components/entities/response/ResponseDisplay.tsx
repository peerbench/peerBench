import {
  getKindAndVersion,
  getBaseFields,
  getCommonResponseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  MultiTurnConversationView,
  ConversationArrayView,
  SimpleRepliesView,
  type ResponseKindRendererProps,
} from "../shared";
import { InsuredQaResponse } from "./llm/insured-qa";
import { FnolMultiTurnResponse } from "./llm/fnol-multi-turn";
import { RigidConversationReplayResponse } from "./llm/rigid-conversation-replay";
import { SingleTurnReferenceComparisonResponse } from "./llm/single-turn-reference-comparison";

export function ResponseDisplay({
  data,
  testCaseData,
  agentEndpointUrl,
  agentProvider,
}: Omit<ResponseKindRendererProps, "kind" | "version">) {
  const { kind, version } = getKindAndVersion(data);
  const baseKind = kind?.replace(/\.(tc|rs|sc)$/, "") ?? null;
  const props = {
    data,
    kind,
    version,
    testCaseData,
    agentEndpointUrl,
    agentProvider,
  };

  if (baseKind === "llm/insured-qa" && version === 1) {
    return <InsuredQaResponse {...props} />;
  }

  if (baseKind === "llm/fnol-multi-turn" && version === 1) {
    return <FnolMultiTurnResponse {...props} />;
  }

  if (baseKind === "llm/rigid-conversation-replay" && version === 1) {
    return <RigidConversationReplayResponse {...props} />;
  }

  if (baseKind === "llm/single-turn-reference-comparison" && version === 1) {
    return <SingleTurnReferenceComparisonResponse {...props} />;
  }

  const baseFields = getBaseFields(data, kind, version);
  const predefined = [...baseFields, ...getCommonResponseFields()];
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
