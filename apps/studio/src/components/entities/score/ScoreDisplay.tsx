import {
  getKindAndVersion,
  getBaseFields,
  getCommonScoreFields,
  getAdditionalFields,
  buildAllFields,
  FieldGrid,
  type KindRendererProps,
} from "../shared";
import { EvaluationSummary } from "@/components/evaluation/EvaluationSummary";
import { isCorrectnessStyleScore } from "@/components/evaluation/scoreToVerdict";
import { InsuredQaScore } from "./llm/insured-qa";
import { FnolMultiTurnScore } from "./llm/fnol-multi-turn";
import { RigidConversationReplayScore } from "./llm/rigid-conversation-replay";
import { SingleTurnReferenceComparisonScore } from "./llm/single-turn-reference-comparison";

export function ScoreDisplay({
  data,
  agentEndpointUrl,
  agentProvider,
}: Omit<KindRendererProps, "kind" | "version">) {
  const { kind, version } = getKindAndVersion(data);
  const baseKind = kind?.replace(/\.(tc|rs|sc)$/, "") ?? null;
  const props = { data, kind, version, agentEndpointUrl, agentProvider };

  const resolveGrid = () => {
    if (baseKind === "llm/insured-qa" && version === 1) {
      return <InsuredQaScore {...props} />;
    }

    if (baseKind === "llm/fnol-multi-turn" && version === 1) {
      return <FnolMultiTurnScore {...props} />;
    }

    if (baseKind === "llm/rigid-conversation-replay" && version === 1) {
      return <RigidConversationReplayScore {...props} />;
    }

    if (baseKind === "llm/single-turn-reference-comparison" && version === 1) {
      return <SingleTurnReferenceComparisonScore {...props} />;
    }

    const baseFields = getBaseFields(data, kind, version);
    const predefined = [...baseFields, ...getCommonScoreFields()];
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
  };

  const grid = resolveGrid();

  if (isCorrectnessStyleScore(data)) {
    return <EvaluationSummary data={data} technicalDetails={grid} />;
  }

  return grid;
}
