import {
  getBaseFields,
  getCommonScoreFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  type KindRendererProps,
} from "../../shared";

export function InsuredQaScore({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: KindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const kindFields = [
    { key: "value", label: "Overall Score", type: "score" as const },
    { key: "insuredScore", label: "Insured Score", type: "score" as const },
    { key: "liableScore", label: "Liable Score", type: "score" as const },
    { key: "reasoningScore", label: "Reasoning Score", type: "score" as const },
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
