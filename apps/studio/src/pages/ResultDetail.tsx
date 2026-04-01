import { useParams, Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ScoreBadge } from "@/components/ui/ScoreBadge";
import { EntityDisplay } from "@/components/EntityDisplay";
import { Button } from "@/components/ui/button";
import { formatDuration, formatTimeAgo } from "@/lib/format-utils";
import { FeedbackWidget } from "@/components/feedback/FeedbackWidget";
import { AgentName } from "@/components/AgentName";
import { CopyAsCurlButton } from "@/components/CopyAsCurlButton";
import { useResult, useRerunResult } from "@/lib/queries";
import type { RawRequestMetadata } from "@/lib/curl-generator";

export function ResultDetail() {
  const { runId, id } = useParams<{ runId: string; id: string }>();
  const navigate = useNavigate();
  const {
    data: result,
    isLoading: loading,
    isError: loadFailed,
  } = useResult(id ?? "", { enabled: !!id });

  const rerunMutation = useRerunResult();

  const handleRerun = () => {
    if (!id || rerunMutation.isPending) return;
    rerunMutation.mutate(id, {
      onSuccess: (data) => {
        navigate(`/runs/${data.runId}`);
      },
    });
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (loadFailed)
    return <div className="text-center py-8">Failed to load result.</div>;
  if (!result) return <div className="text-center py-8">Result not found</div>;

  const responseMetadata = result.response?.metadata as
    | Record<string, unknown>
    | undefined;
  const rawRequest = responseMetadata?.rawRequest as
    | RawRequestMetadata
    | undefined;
  const authIdentity = responseMetadata?.authIdentity as
    | { resolved: true; userId: string; email?: string; name?: string; expiresAt?: string }
    | { resolved: false; reason: string }
    | undefined;

  return (
    <div className="space-y-6">
      {/* Breadcrumb bar */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-gray-500 hover:text-gray-700"
          >
            <Link to="/runs">Runs</Link>
          </Button>
          <span>/</span>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-gray-500 hover:text-gray-700 font-mono"
          >
            <Link to={`/runs/${runId}`}>{runId?.substring(0, 8)}...</Link>
          </Button>
          <span>/</span>
          <span>Results</span>
          <span>/</span>
          <span className="font-mono">{result.id.substring(0, 8)}...</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Result Details
            <StatusBadge
              status={
                result.status as
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed"
                  | "partial"
                  | "success"
              }
            />
          </h1>
          <div className="flex items-center gap-2 ml-auto">
            {rawRequest && <CopyAsCurlButton rawRequest={rawRequest} />}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRerun}
              disabled={rerunMutation.isPending}
            >
              {rerunMutation.isPending ? "Rerunning..." : "Rerun Test Case"}
            </Button>
          </div>
        </div>
      </div>

      {rerunMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-700">
            Failed to rerun:{" "}
            {rerunMutation.error instanceof Error
              ? rerunMutation.error.message
              : "Unknown error"}
          </p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Score</p>
          <div className="mt-1">
            <ScoreBadge score={result.scoreValue} size="lg" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Duration</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatDuration(result.durationMs)}
          </p>
          {result.ttftMs != null && (
            <p className="text-xs text-gray-400 mt-1">
              TTFT: {result.ttftMs}ms
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Tokens</p>
          <p className="text-2xl font-bold text-gray-900">
            {result.inputTokensUsed || 0} in
          </p>
          <p className="text-sm text-gray-500">
            {result.outputTokensUsed || 0} out
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Started</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {formatTimeAgo(result.startedAt)}
          </p>
          {result.startedAt && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(result.startedAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {formatTimeAgo(result.completedAt)}
          </p>
          {result.completedAt && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(result.completedAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Context info bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Context</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Agent</p>
            {result.agentId ? (
              <Link
                to={`/agents/${result.agentId}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                <AgentName
                  name={result.agentName || result.modelSlug || result.agentId}
                  provider={result.agentProvider}
                  endpointUrl={result.agentEndpointUrl}
                />
              </Link>
            ) : (
              <AgentName
                name={result.agentName || result.modelSlug || "—"}
                provider={result.agentProvider}
                endpointUrl={result.agentEndpointUrl}
                className="text-gray-900"
              />
            )}
          </div>
          <div>
            <p className="text-gray-500">Config</p>
            {result.configId ? (
              <Link
                to={`/configs/${result.configId}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {result.configName || result.configId}
              </Link>
            ) : (
              <p className="text-gray-900">{result.configName || "—"}</p>
            )}
          </div>
          <div>
            <p className="text-gray-500">Runner</p>
            <p className="text-gray-900">{result.runner || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">Scorer</p>
            <p className="text-gray-900">{result.scorer || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500">System Prompt</p>
            <p className="text-gray-900">
              {result.systemPromptId ? (
                <>
                  {result.systemPromptId}
                  {result.systemPromptVersion != null &&
                    ` v${result.systemPromptVersion}`}
                  {result.systemPromptHash && (
                    <span
                      className="text-xs text-gray-400 font-mono ml-1"
                      title={result.systemPromptHash}
                    >
                      ({result.systemPromptHash.substring(0, 8)})
                    </span>
                  )}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Test Case ID</p>
            <p
              className="text-gray-900 font-mono truncate"
              title={result.pureTestCaseId || result.testCaseId}
            >
              {result.pureTestCaseId || result.testCaseId}
            </p>
          </div>
          {authIdentity && (
            <div className="col-span-2 md:col-span-3 border-t pt-3 mt-1">
              <p className="text-gray-500 mb-1">FNOL Auth Identity</p>
              {authIdentity.resolved ? (
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-900">
                    <span className="text-gray-500">user:</span>{" "}
                    <span className="font-mono">{authIdentity.userId}</span>
                  </span>
                  {authIdentity.email && (
                    <span className="text-gray-900">
                      <span className="text-gray-500">email:</span>{" "}
                      {authIdentity.email}
                    </span>
                  )}
                  {authIdentity.name && (
                    <span className="text-gray-900">
                      <span className="text-gray-500">name:</span>{" "}
                      {authIdentity.name}
                    </span>
                  )}
                  {authIdentity.expiresAt && (
                    <span className="text-gray-400 text-xs">
                      expires {new Date(authIdentity.expiresAt).toLocaleString()}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-red-600 text-sm font-medium">
                  Not resolved: {authIdentity.reason}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error message */}
      {result.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
          <p className="text-sm text-red-700">{result.errorMessage}</p>
        </div>
      )}

      {/* EntityDisplay sections */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="max-w-6xl mx-auto space-y-0">
          {/* Test Case Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Test Case
              </h3>
              <span className="text-xs text-gray-500">(Input)</span>
            </div>
            {result.testCase ? (
              <div className="ml-11">
                <EntityDisplay
                  type="testCase"
                  data={result.testCase}
                  maxHeight={800}
                />
              </div>
            ) : (
              <div className="ml-11 bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-500">
                  Test case data not available
                </p>
              </div>
            )}
          </div>

          {/* Flow Arrow */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-10 bg-gray-400"></div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-400"></div>
            </div>
          </div>

          {/* Response Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                Response
              </h3>
              <span className="text-xs text-gray-500">(Output)</span>
            </div>
            {result.status === "failed" && result.errorMessage ? (
              <div className="ml-11 bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-red-800 mb-2">Error</h4>
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {result.errorMessage}
                </p>
              </div>
            ) : result.response ? (
              <div className="ml-11">
                <EntityDisplay
                  type="response"
                  data={result.response}
                  maxHeight={800}
                  testCaseData={result.testCase}
                  agentEndpointUrl={result.agentEndpointUrl}
                  agentProvider={result.agentProvider}
                />
              </div>
            ) : (
              <div className="ml-11 bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-500">
                  No response data available
                </p>
              </div>
            )}
          </div>

          {/* Flow Arrow */}
          <div className="flex justify-center mb-8">
            <div className="flex flex-col items-center">
              <div className="w-0.5 h-10 bg-gray-400"></div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-400"></div>
            </div>
          </div>

          {/* Score Section */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-semibold text-gray-900">Score</h3>
              <span className="text-xs text-gray-500">(Evaluation)</span>
            </div>
            {result.score ? (
              <div className="ml-11 space-y-4">
                <EntityDisplay
                  type="score"
                  data={result.score}
                  maxHeight={800}
                />
                <FeedbackWidget resultId={result.id} />
              </div>
            ) : (
              <div className="ml-11 bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 text-center">
                <p className="text-sm text-gray-500">No score data available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
