import { useEffect, useState } from "react";
import { api, type ScorerMeta } from "@/lib/api";
import { toastError } from "@/lib/toast";
import { ExpandableCard } from "@/components/ui/ExpandableCard";
import ReactMarkdown from "react-markdown";

function ScorerCardHeader({ scorer }: { scorer: ScorerMeta }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">{scorer.name}</h3>
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded ${
            scorer.requiresProvider
              ? "bg-purple-100 text-purple-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {scorer.requiresProvider ? "Requires LLM" : "Deterministic"}
        </span>
      </div>
      <code className="text-sm text-primary font-mono">{scorer.id}</code>
    </div>
  );
}

function ScorerCardBody({ scorer }: { scorer: ScorerMeta }) {
  return (
    <>
      <div className="mt-4 prose prose-sm max-w-none">
        <ReactMarkdown>{scorer.longDescription}</ReactMarkdown>
      </div>

      {scorer.outputSchema && Object.keys(scorer.outputSchema).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Output Schema
          </h4>
          <div className="bg-muted/50 rounded-lg p-4 divide-y divide-border">
            {Object.entries(scorer.outputSchema).map(([name, field]) => (
              <div key={name} className="py-2">
                <div className="flex items-start gap-3">
                  <code className="text-sm font-semibold">{name}</code>
                  <span className="px-2 py-0.5 text-xs font-mono bg-blue-100 text-blue-700 rounded">
                    {field.type}
                  </span>
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

export function Scorers() {
  const [scorers, setScorers] = useState<ScorerMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getBenchmarkMeta()
      .then((data) => {
        setScorers(data.scorers || []);
      })
      .catch((err) => {
        toastError(err, "Failed to load scorers");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading scorers...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scorers</h1>
        <p className="text-muted-foreground mt-1">
          Available scoring methods for evaluating AI responses. Click to view
          detailed documentation.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
              Requires LLM
            </span>
          </div>
          <p className="text-sm text-purple-800">
            Uses an LLM (like GPT-4 or Gemini) to evaluate responses. More
            flexible but requires API calls and incurs costs.
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
              Deterministic
            </span>
          </div>
          <p className="text-sm text-green-800">
            Uses algorithmic rules to evaluate responses. Fast, consistent, and
            free, but limited to specific patterns.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {scorers.map((scorer) => (
          <ExpandableCard
            key={scorer.id}
            isExpanded={expandedId === scorer.id}
            onToggle={() =>
              setExpandedId(expandedId === scorer.id ? null : scorer.id)
            }
            header={<ScorerCardHeader scorer={scorer} />}
            description={scorer.description}
          >
            <ScorerCardBody scorer={scorer} />
          </ExpandableCard>
        ))}
      </div>

      {scorers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No scorers available.
        </div>
      )}
    </div>
  );
}
