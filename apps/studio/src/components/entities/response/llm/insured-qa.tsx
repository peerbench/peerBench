import {
  getBaseFields,
  getCommonResponseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  SimpleRepliesView,
  type ResponseKindRendererProps,
} from "../../shared";

export function InsuredQaResponse({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: ResponseKindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    {
      key: "insured",
      label: "Insured Status",
      type: "badge" as const,
      badgeColor: "green" as const,
    },
    { key: "liable", label: "Liable", type: "text" as const, isLongText: true },
    {
      key: "reasoning",
      label: "Reasoning",
      type: "text" as const,
      isLongText: true,
    },
    {
      key: "data",
      label: "Data",
      type: "text" as const,
      skip: !!data.replies,
      isLongText: true,
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

  return (
    <div className="space-y-4">
      <FieldGrid
        fields={allFields}
        data={data}
        agentEndpointUrl={agentEndpointUrl}
        agentProvider={agentProvider}
        isResponse
      />
      <SimpleRepliesView replies={replies} />
    </div>
  );
}
