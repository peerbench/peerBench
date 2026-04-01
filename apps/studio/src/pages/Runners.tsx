import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type RunnerMeta } from "@/lib/api";
import { toastError } from "@/lib/toast";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import ReactMarkdown from "react-markdown";

function RunnerCardHeader({ runner }: { runner: RunnerMeta }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">{runner.name}</h3>
        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
          {runner.schemaSet}
        </span>
      </div>
      <code className="text-sm text-primary font-mono">{runner.id}</code>
    </div>
  );
}

function RunnerCardBody({ runner }: { runner: RunnerMeta }) {
  return (
    <>
      {runner.longDescription && (
        <div className="mt-4 prose prose-sm max-w-none">
          <ReactMarkdown>{runner.longDescription}</ReactMarkdown>
        </div>
      )}

      {runner.configSchema && Object.keys(runner.configSchema).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Configuration Options
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 divide-y divide-border">
            {Object.entries(runner.configSchema).map(([name, field]) => (
              <div key={name} className="py-2">
                <div className="flex items-start gap-3">
                  <code className="text-sm font-semibold">{name}</code>
                  <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 text-blue-700 rounded">
                    {field.type}
                  </span>
                  {field.required && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                      required
                    </span>
                  )}
                </div>
                {field.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {field.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function Runners() {
  const [runners, setRunners] = useState<RunnerMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBenchmarkMeta()
      .then((data) => {
        setRunners(data.runners || []);
      })
      .catch((err) => {
        toastError(err, "Failed to load runners");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading runners...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Runners</h1>
        <p className="text-muted-foreground mt-1">
          Available test runners for executing benchmarks against AI agents.
          Click to view detailed documentation.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          What are Runners?
        </h3>
        <p className="text-sm text-blue-800">
          Runners define how test cases are executed against AI agents. Each
          runner specifies the conversation flow, how responses are collected,
          and which scorers can be used for evaluation. Choose the runner that
          matches your test scenario.
        </p>
        <div className="mt-3 pt-3 border-t border-blue-200">
          <Link
            to="/runners/leaderboard-per-runner"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            View Leaderboard by Runner
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="space-y-4">
        {runners.map((runner) => (
          <ExpandableCard
            key={runner.id}
            isExpanded={expandedId === runner.id}
            onToggle={() =>
              setExpandedId(expandedId === runner.id ? null : runner.id)
            }
            header={<RunnerCardHeader runner={runner} />}
            description={runner.description}
          >
            <RunnerCardBody runner={runner} />
          </ExpandableCard>
        ))}
      </div>

      {runners.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No runners available.
        </div>
      )}
    </div>
  );
}
