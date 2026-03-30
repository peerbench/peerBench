import {
  getKindAndVersion,
  getBaseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  MessagesView,
  type KindRendererProps,
} from "../shared";
import { InsuredQaTestCase } from "./llm/insured-qa";
import { FnolMultiTurnTestCase } from "./llm/fnol-multi-turn";
import { RigidConversationReplayTestCase } from "./llm/rigid-conversation-replay";
import { SingleTurnReferenceComparisonTestCase } from "./llm/single-turn-reference-comparison";

export function TestCaseDisplay({
  data,
  agentEndpointUrl,
  agentProvider,
}: Omit<KindRendererProps, "kind" | "version">) {
  const { kind, version } = getKindAndVersion(data);
  const baseKind = kind?.replace(/\.(tc|rs|sc)$/, "") ?? null;
  const props = { data, kind, version, agentEndpointUrl, agentProvider };

  if (baseKind === "llm/insured-qa" && version === 1) {
    return <InsuredQaTestCase {...props} />;
  }

  if (baseKind === "llm/fnol-multi-turn" && version === 1) {
    return <FnolMultiTurnTestCase {...props} />;
  }

  if (baseKind === "llm/rigid-conversation-replay" && version === 1) {
    return <RigidConversationReplayTestCase {...props} />;
  }

  if (baseKind === "llm/single-turn-reference-comparison" && version === 1) {
    return <SingleTurnReferenceComparisonTestCase {...props} />;
  }

  const baseFields = getBaseFields(data, kind, version);
  const additional = getAdditionalFields(data, baseFields);
  const allFields = buildAllFields(baseFields, additional, data);
  const messages = Array.isArray(data.messages) ? data.messages : [];

  if (messages.length > 0) {
    return (
      <div className="space-y-4">
        <FieldGrid
          fields={allFields}
          data={data}
          agentEndpointUrl={agentEndpointUrl}
          agentProvider={agentProvider}
        />
        <MessagesView messages={messages} />
      </div>
    );
  }

  return (
    <FieldGrid
      fields={allFields}
      data={data}
      agentEndpointUrl={agentEndpointUrl}
      agentProvider={agentProvider}
    />
  );
}
