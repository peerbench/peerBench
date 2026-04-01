import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdvancedMode } from "@/hooks/useAdvancedMode";
import { FeedbackAdminSection } from "@/components/admin/FeedbackAdminSection";

const API_BASE =
  window.__ENV__?.VITE_API_URL || import.meta.env.VITE_API_URL || "";

export function Admin() {
  const [healthResult, setHealthResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedMode, setAdvancedMode] = useAdvancedMode();
  const [envEntries, setEnvEntries] = useState<EnvEntry[]>([]);
  const [envLoading, setEnvLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await res.json();
      setHealthResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchEnvDebug = async () => {
    setEnvLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/env-debug`);
      const data: { entries: EnvEntry[] } = await res.json();
      setEnvEntries(data.entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnvLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Health Check</h2>
              <Button onClick={checkHealth} disabled={loading}>
                {loading ? "Loading..." : "GET /api/health"}
              </Button>
            </div>
            {healthResult !== null && (
              <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(healthResult, null, 2)}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Environment Variables</h2>
              <Button onClick={fetchEnvDebug} disabled={envLoading}>
                {envLoading ? "Loading..." : "GET /api/env-debug"}
              </Button>
            </div>
            {envEntries.length > 0 && (
              <div className="overflow-auto max-h-[32rem]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Obfuscated Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {envEntries.map((entry) => (
                      <tr key={entry.name} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {entry.name}
                        </td>
                        <td className="py-2 pr-4">
                          <EnvStatusBadge status={entry.status} />
                        </td>
                        <td className="py-2 font-mono text-xs text-muted-foreground">
                          {entry.status === "set" && entry.obfuscated}
                          {entry.status === "short" && (
                            <span className="italic">less than 10 chars</span>
                          )}
                          {entry.status === "unset" && (
                            <span className="italic">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <Checkbox
                checked={advancedMode}
                onCheckedChange={(checked) => setAdvancedMode(checked === true)}
              />
              <span>Advanced Mode</span>
            </label>
          </CardContent>
        </Card>
      </div>

      <FeedbackAdminSection />
    </div>
  );
}

function EnvStatusBadge({ status }: { status: EnvEntry["status"] }) {
  const config = {
    set: { label: "Set", className: "bg-green-100 text-green-800" },
    short: { label: "Short", className: "bg-yellow-100 text-yellow-800" },
    unset: { label: "Unset", className: "bg-gray-100 text-gray-500" },
  } as const;

  const { label, className } = config[status];

  return (
    <span
      className={`inline-flex items-center rounded-md text-xs px-1.5 py-0.5 font-medium ${className}`}
    >
      {label}
    </span>
  );
}

type EnvEntry = {
  name: string;
  status: "set" | "short" | "unset";
  obfuscated: string | null;
};
