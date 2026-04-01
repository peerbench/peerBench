import { useState } from "react";
import { type LocalConfig } from "@/lib/api";
import { useLocalConfigs, useImportLocalConfig } from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toastError, toastSuccess } from "@/lib/toast";

interface LocalConfigImportProps {
  onImport?: () => void;
}

export function LocalConfigImport({ onImport }: LocalConfigImportProps) {
  const [importing, setImporting] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const localConfigsQuery = useLocalConfigs();
  const importMutation = useImportLocalConfig();

  const scanResult = localConfigsQuery.data ?? null;
  const loading = localConfigsQuery.isLoading;

  const handleImport = (config: LocalConfig) => {
    setImporting(config.name);
    importMutation.mutate(
      { name: config.name },
      {
        onSuccess: () => {
          toastSuccess(`Imported "${config.name}"`);
          onImport?.();
          queryClient.invalidateQueries({ queryKey: ["localConfigs"] });
        },
        onError: (err) => {
          toastError(err, "Failed to import");
        },
        onSettled: () => {
          setImporting(null);
        },
      }
    );
  };

  const handleImportAll = async () => {
    if (!scanResult || scanResult.configs.length === 0) return;

    setImportingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const config of scanResult.configs) {
      try {
        await importMutation.mutateAsync({ name: config.name });
        successCount++;
      } catch {
        failCount++;
      }
    }

    if (successCount > 0) {
      toastSuccess(
        `Imported ${successCount} config${successCount !== 1 ? "s" : ""}`
      );
      onImport?.();
    }
    if (failCount > 0) {
      toastError(new Error(`${failCount} failed`), "Some imports failed");
    }

    queryClient.invalidateQueries({ queryKey: ["localConfigs"] });
    setImportingAll(false);
  };

  if (loading && !scanResult) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <p className="text-gray-500">Scanning local directories...</p>
      </div>
    );
  }

  if (!scanResult || scanResult.configs.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-700">Import from Local Files</h3>
          <button
            onClick={() => localConfigsQuery.refetch()}
            disabled={localConfigsQuery.isFetching}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {localConfigsQuery.isFetching ? "Scanning..." : "Refresh"}
          </button>
        </div>
        <p className="text-sm text-gray-500">
          No local configs found in scanned directories.
        </p>
        {scanResult && (
          <div className="mt-2 text-xs text-gray-400">
            <p>Scanned directories:</p>
            <ul className="list-disc list-inside ml-2">
              {scanResult.directories.map((dir) => (
                <li key={dir.path} className={dir.exists ? "" : "line-through"}>
                  {dir.path} {!dir.exists && "(not found)"}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-gray-700">Import from Local Files</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleImportAll}
            disabled={importingAll || localConfigsQuery.isFetching}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {importingAll
              ? "Importing..."
              : `Import All (${scanResult.configs.length})`}
          </button>
          <button
            onClick={() => localConfigsQuery.refetch()}
            disabled={localConfigsQuery.isFetching}
            className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {localConfigsQuery.isFetching ? "Scanning..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {scanResult.configs.map((config) => (
          <div
            key={config.id}
            className="bg-white border rounded-lg overflow-hidden"
          >
            <div
              className="p-3 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpanded(expanded === config.name ? null : config.name)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{config.name}</span>
                    <span className="text-xs text-gray-400">
                      {expanded === config.name ? "▼" : "▶"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {config.hasTestCases && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded">
                        test cases
                      </span>
                    )}
                    {config.hasSystemPrompt && (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                        system prompt
                      </span>
                    )}
                    {config.hasJudgePrompt && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                        judge prompt
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImport(config);
                  }}
                  disabled={importing === config.name}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {importing === config.name ? "Importing..." : "Import"}
                </button>
              </div>
            </div>

            {expanded === config.name && (
              <div className="p-3 border-t bg-gray-50">
                <div className="text-xs text-gray-500 mb-2">
                  <strong>Path:</strong> {config.path}
                </div>
                <div className="text-xs">
                  <strong>Config:</strong>
                  <pre className="mt-1 p-2 bg-gray-100 rounded overflow-x-auto max-h-48">
                    {JSON.stringify(config.config, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        <details>
          <summary className="cursor-pointer hover:text-gray-600">
            Scanned directories
          </summary>
          <ul className="list-disc list-inside ml-2 mt-1">
            {scanResult.directories.map((dir) => (
              <li key={dir.path}>
                {dir.path} -{" "}
                {dir.exists ? `${dir.configCount} configs` : "not found"}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}
