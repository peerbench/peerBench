import {
  getBaseFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  type KindRendererProps,
} from "../../shared";

export function InsuredQaTestCase({
  data,
  kind,
  version,
  agentEndpointUrl,
  agentProvider,
}: KindRendererProps) {
  const baseFields = getBaseFields(data, kind, version);

  const metadata = data.metadata as Record<string, unknown> | undefined;
  const isFromDQ =
    metadata &&
    typeof metadata.source === "string" &&
    metadata.source.includes("supabase");

  const kindFields = [
    {
      key: "question",
      label: "Question",
      type: "text" as const,
      isLongText: true,
    },
    {
      key: "insured",
      label: "Expected: Insured Status",
      type: "badge" as const,
      badgeColor: "blue" as const,
    },
    {
      key: "liable",
      label: "Expected: Liable",
      type: "text" as const,
      isLongText: true,
    },
    {
      key: "reasoning",
      label: "Expected: Reasoning",
      type: "text" as const,
      isLongText: true,
    },
    ...(isFromDQ && data.id
      ? [
          {
            key: "id",
            label: "DQ Source",
            type: "dq_link" as const,
            dqLinkType: "question" as const,
          },
        ]
      : []),
  ];

  const predefined = [...baseFields, ...kindFields];
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
