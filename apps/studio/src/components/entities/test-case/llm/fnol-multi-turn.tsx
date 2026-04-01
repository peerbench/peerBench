import {
  getBaseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  MessagesView,
  type KindRendererProps,
} from "../../shared";

export function FnolMultiTurnTestCase({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: KindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    {
      key: "globalExpectations",
      label: "Global Expectations",
      type: "text" as const,
      isLongText: true,
    },
  ];

  const predefined = [...baseFields, ...kindFields];
  const additional = getAdditionalFields(data, predefined);
  const allFields = buildAllFields(predefined, additional, data);

  const messages = Array.isArray(data.messages) ? data.messages : [];

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
