import {
  getBaseFields,
  getCommonScoreFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  type KindRendererProps,
} from "../../shared";

export function FnolMultiTurnScore({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: KindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    { key: "value", label: "Overall Score", type: "score" as const },
    {
      key: "individualScores",
      label: "Individual Scores",
      type: "list" as const,
    },
    {
      key: "explanation",
      label: "Explanation",
      type: "text" as const,
      isLongText: true,
    },
  ];

  const predefined = [...baseFields, ...kindFields, ...getCommonScoreFields()];
  const additional = getAdditionalFields(data, predefined);
  const allFields = buildAllFields(predefined, additional, data);

  return (
    <FieldGrid
      fields={allFields}
      data={data}
      agentEndpointUrl={agentEndpointUrl}
      agentProvider={agentProvider}
    />
  );
}
