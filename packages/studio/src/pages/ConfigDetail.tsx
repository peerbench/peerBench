import { useEffect, useState, useMemo } from "react";
import {
  useParams,
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { JsonDisplay } from "@/components/ui/JsonDisplay";
import { toastSuccess } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { formatTimeAgo } from "@/lib/format-utils";
import {
  useConfig,
  useConfigVersions,
  useUpdateConfig,
  useCreateRun,
  useExecuteQuickTest,
} from "@/lib/queries";
import { api } from "@/lib/api";

export function ConfigDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Query hooks for config and versions
  const {
    data: fetchedConfig,
    isLoading: loadingConfig,
    isError: loadFailed,
  } = useConfig(id ?? "", { enabled: !!id });

  // Handle redirect for child configs
  const effectiveId = fetchedConfig?.initialConfigId ?? id;
  const shouldRedirect =
    fetchedConfig?.initialConfigId && id !== fetchedConfig.initialConfigId;

  // Use the anchor config ID for the anchor query
  const { data: anchorConfig, isLoading: loadingAnchorConfig } = useConfig(
    effectiveId ?? "",
    {
      enabled: !!effectiveId && !shouldRedirect,
    }
  );

  const { data: versionsData } = useConfigVersions(effectiveId ?? "", {
    enabled: !!effectiveId && !shouldRedirect,
  });
  const versions = versionsData?.versions ?? [];

  const loading = loadingConfig || loadingAnchorConfig;

  // Mutation hooks
  const updateConfigMutation = useUpdateConfig();
  const createRunMutation = useCreateRun();
  const executeQuickTestMutation = useExecuteQuickTest();

  // Derived mutation states
  const executing =
    createRunMutation.isPending || executeQuickTestMutation.isPending;
  const saving = updateConfigMutation.isPending;
  const savingJson = updateConfigMutation.isPending;

  // Local UI state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editingJson, setEditingJson] = useState(false);
  const [editJsonText, setEditJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [curlCopied, setCurlCopied] = useState(false);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [endpointOverride, setEndpointOverride] = useState("");
  const [maxTestCases, setMaxTestCases] = useState("");

  const selectedVersionId = searchParams.get("v");

  const selectedVersion = useMemo(() => {
    if (versions.length > 0) {
      if (selectedVersionId) {
        const found = versions.find((v) => v.id === selectedVersionId);
        if (found) return found;
      }
      return versions[versions.length - 1];
    }
    return anchorConfig;
  }, [versions, selectedVersionId, anchorConfig]);

  const latestVersion =
    versions.length > 0 ? versions[versions.length - 1] : null;
  const isLatestSelected =
    latestVersion === null || selectedVersion?.id === latestVersion.id;

  // Handle redirect for child configs
  useEffect(() => {
    if (shouldRedirect && fetchedConfig?.initialConfigId) {
      const vParam = searchParams.get("v") ?? id;
      navigate(`/configs/${fetchedConfig.initialConfigId}?v=${vParam}`, {
        replace: true,
      });
    }
  }, [
    shouldRedirect,
    fetchedConfig?.initialConfigId,
    id,
    searchParams,
    navigate,
  ]);

  // Cancel JSON editing when selected version changes
  useEffect(() => {
    if (editingJson) {
      setEditingJson(false);
      setEditJsonText("");
      setJsonError(null);
    }
  }, [selectedVersionId]);

  const handleExecute = () => {
    if (!selectedVersion) return;

    const hasAdvancedOptions =
      endpointOverride.trim() ||
      (maxTestCases && parseInt(maxTestCases, 10) > 0);

    if (hasAdvancedOptions) {
      const options: {
        maxTestCasesPerConfig?: number;
        endpointBaseOverride?: string;
      } = {};

      if (maxTestCases && parseInt(maxTestCases, 10) > 0) {
        options.maxTestCasesPerConfig = parseInt(maxTestCases, 10);
      }
      if (endpointOverride.trim()) {
        options.endpointBaseOverride = endpointOverride.trim();
      }

      executeQuickTestMutation.mutate(
        { configIds: [selectedVersion.id], options },
        {
          onSuccess: (result) => {
            if (result.runs.length > 0 && result.runs[0].runId) {
              navigate(`/runs/${result.runs[0].runId}`);
            }
          },
        }
      );
    } else {
      createRunMutation.mutate(
        {
          configId: selectedVersion.id,
          configSnapshot: selectedVersion.configJson,
          metadata: { triggeredBy: "web" },
        },
        {
          onSuccess: (run) => {
            // Fire-and-forget execution - don't wait for it to complete
            api.executeRun(run.id).catch(() => {});
            navigate(`/runs/${run.id}`);
          },
        }
      );
    }
  };

  const startEditing = () => {
    if (!anchorConfig) return;
    setEditName(anchorConfig.name);
    setEditDescription(anchorConfig.description || "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditName("");
    setEditDescription("");
  };

  const handleSave = () => {
    if (!anchorConfig) return;
    updateConfigMutation.mutate(
      {
        id: anchorConfig.id,
        data: { name: editName, description: editDescription || undefined },
      },
      {
        onSuccess: () => {
          setEditing(false);
          // Cache invalidation handles refresh
        },
      }
    );
  };

  const startEditingJson = () => {
    if (!selectedVersion) return;
    setEditJsonText(JSON.stringify(selectedVersion.configJson, null, 2));
    setJsonError(null);
    setEditingJson(true);
  };

  const cancelEditingJson = () => {
    setEditingJson(false);
    setEditJsonText("");
    setJsonError(null);
  };

  const handleJsonChange = (value: string) => {
    setEditJsonText(value);
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSaveJson = () => {
    if (!anchorConfig || !selectedVersion) return;

    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(editJsonText);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    updateConfigMutation.mutate(
      { id: selectedVersion.id, data: { configJson: parsedJson } },
      {
        onSuccess: (updated) => {
          setEditingJson(false);
          setSearchParams({ v: updated.id });
          // Cache invalidation handles versions refresh
        },
      }
    );
  };

  const handleCopyCurl = async () => {
    if (!selectedVersion) return;

    const baseUrl = window.location.origin;
    const curlCommand = `curl -X POST "${baseUrl}/api/runs/execute" \\
  -H "Content-Type: application/json" \\
  -d '{"configId": "${selectedVersion.id}"}'`;

    try {
      await navigator.clipboard.writeText(curlCommand);
      setCurlCopied(true);
      toastSuccess("cURL command copied to clipboard");
      setTimeout(() => setCurlCopied(false), 2000);
    } catch {
      // Clipboard API failed - silently fail since the UI shows the copy state
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (loadFailed)
    return (
      <div className="text-center py-8">Failed to load configuration.</div>
    );
  if (!anchorConfig)
    return <div className="text-center py-8">Config not found</div>;

  const displayConfig = selectedVersion ?? anchorConfig;

  return (
    <div className="space-y-6">
      {/* Group-level header: breadcrumb, name, description, edit */}
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-gray-500 hover:text-gray-700"
            >
              <Link to="/configs">Configurations</Link>
            </Button>
            <span>/</span>
            <span>{anchorConfig.name}</span>
          </div>
          {editing ? (
            <div className="space-y-3 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-lg"
                  placeholder="Configuration name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  {anchorConfig.name}
                </h1>
                <button
                  onClick={startEditing}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit name and description"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </button>
              </div>
              {anchorConfig.description ? (
                <p className="text-gray-500 mt-1">{anchorConfig.description}</p>
              ) : (
                <button
                  onClick={startEditing}
                  className="text-sm text-gray-400 hover:text-gray-600 mt-1"
                >
                  + Add description
                </button>
              )}
            </div>
          )}
        </div>
        {/* Action bar — uses selectedVersion */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExecute}
            disabled={executing}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {executing ? "Running..." : "Run Benchmark"}
          </button>
          <button
            onClick={handleCopyCurl}
            className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-1.5"
            title="Copy cURL command to start a run"
          >
            {curlCopied ? (
              <>
                <svg
                  className="w-4 h-4 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy cURL
              </>
            )}
          </button>
          <Link
            to={`/runs?configId=${displayConfig.id}`}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View Runs
          </Link>
        </div>
      </div>

      {/* Advanced Run Options */}
      <div className="bg-white rounded-lg shadow">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className={`transform transition-transform ${showAdvanced ? "rotate-90" : ""}`}
            >
              ▶
            </span>
            <span className="font-medium text-gray-700">
              Advanced Run Options
            </span>
            {(endpointOverride || maxTestCases) && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                Modified
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            Override endpoint, limit test cases
          </span>
        </button>

        {showAdvanced && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endpoint Override (optional)
              </label>
              <input
                type="text"
                value={endpointOverride}
                onChange={(e) => setEndpointOverride(e.target.value)}
                placeholder="https://staging.example.com"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Replace the base URL in all target endpoints (paths are
                preserved)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Test Cases (optional)
              </label>
              <input
                type="number"
                value={maxTestCases}
                onChange={(e) => setMaxTestCases(e.target.value)}
                placeholder="Leave empty for all"
                min="1"
                className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                Limit to first N test cases for faster validation
              </p>
            </div>

            {(endpointOverride || maxTestCases) && (
              <div className="flex items-center gap-2 pt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-md">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>
                  Run will be marked as a <strong>practice run</strong> and
                  filtered from normal views
                </span>
              </div>
            )}

            {(endpointOverride || maxTestCases) && (
              <button
                onClick={() => {
                  setEndpointOverride("");
                  setMaxTestCases("");
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear overrides
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats cards — version-specific */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Run Count</p>
          <p className="text-2xl font-bold">{displayConfig.runCount}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-lg font-medium">
            {new Date(displayConfig.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Hash</p>
          <p className="text-lg font-mono">{displayConfig.configHash}</p>
        </div>
      </div>

      {anchorConfig.tags && anchorConfig.tags.length > 0 && (
        <div className="flex gap-2">
          {anchorConfig.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Configuration JSON section — two-column when versioned */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Configuration</h2>
            {displayConfig.version && (
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                v{displayConfig.version}
              </span>
            )}
          </div>
          {!editingJson && isLatestSelected && (
            <button
              onClick={startEditingJson}
              className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Edit
            </button>
          )}
        </div>
        <div className="p-4">
          {versions.length > 1 ? (
            <div className="grid grid-cols-[220px_1fr] gap-4">
              {/* Version sidebar */}
              <div
                className="space-y-1 max-h-[500px] overflow-y-auto"
                data-testid="version-sidebar"
              >
                {[...versions].reverse().map((v) => {
                  const isActive = v.id === displayConfig.id;
                  const isLatest = v.id === versions[versions.length - 1].id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setSearchParams({ v: v.id })}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-blue-50 border-l-2 border-l-blue-600"
                          : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-xs">
                          v{v.version}
                        </span>
                        {isLatest && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <span>{formatTimeAgo(v.createdAt)}</span>
                        <span className="font-mono text-gray-400">
                          {v.configHash.slice(0, 8)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {/* Config content */}
              <div>
                {editingJson ? (
                  <div className="space-y-3">
                    <textarea
                      value={editJsonText}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className={`w-full h-96 font-mono text-sm p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        jsonError
                          ? "border-red-300 bg-red-50"
                          : "border-gray-300"
                      }`}
                      spellCheck={false}
                    />
                    {jsonError && (
                      <p className="text-sm text-red-600">
                        <span className="font-medium">JSON Error:</span>{" "}
                        {jsonError}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveJson}
                        disabled={savingJson || !!jsonError}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingJson ? "Saving..." : "Save Changes"}
                      </button>
                      <button
                        onClick={cancelEditingJson}
                        disabled={savingJson}
                        className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <JsonDisplay
                    data={displayConfig.configJson}
                    maxHeight={400}
                  />
                )}
              </div>
            </div>
          ) : editingJson ? (
            <div className="space-y-3">
              <textarea
                value={editJsonText}
                onChange={(e) => handleJsonChange(e.target.value)}
                className={`w-full h-96 font-mono text-sm p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  jsonError ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                spellCheck={false}
              />
              {jsonError && (
                <p className="text-sm text-red-600">
                  <span className="font-medium">JSON Error:</span> {jsonError}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveJson}
                  disabled={savingJson || !!jsonError}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingJson ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={cancelEditingJson}
                  disabled={savingJson}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <JsonDisplay data={displayConfig.configJson} maxHeight={400} />
          )}
        </div>
      </div>
    </div>
  );
}
