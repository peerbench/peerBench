import { JsonDisplay } from "./ui/JsonDisplay";
import { getKindAndVersion } from "./entities/shared";
import { TestCaseDisplay } from "./entities/test-case/TestCaseDisplay";
import { ResponseDisplay } from "./entities/response/ResponseDisplay";
import { ScoreDisplay } from "./entities/score/ScoreDisplay";

export function EntityDisplay({
  type,
  data,
  maxHeight = 400,
  testCaseData = null,
  agentEndpointUrl,
  agentProvider,
}: EntityDisplayProps) {
  const { kind } = getKindAndVersion(data);

  if (!kind) {
    return <JsonDisplay data={data} maxHeight={maxHeight} />;
  }

  const sharedProps = { data, agentEndpointUrl, agentProvider };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      {type === "testCase" && <TestCaseDisplay {...sharedProps} />}
      {type === "response" && (
        <ResponseDisplay {...sharedProps} testCaseData={testCaseData} />
      )}
      {type === "score" && <ScoreDisplay {...sharedProps} />}
    </div>
  );
}

type EntityType = "testCase" | "response" | "score";

interface EntityDisplayProps {
  type: EntityType;
  data: Record<string, unknown>;
  maxHeight?: number;
  testCaseData?: Record<string, unknown> | null;
  agentEndpointUrl?: string | null;
  agentProvider?: string | null;
}
