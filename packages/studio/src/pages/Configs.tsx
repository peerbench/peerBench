import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type Config } from "@/lib/api";
import { JsonDisplay } from "@/components/ui/JsonDisplay";
import { LocalConfigImport } from "@/components/LocalConfigImport";
import {
  useConfigs,
  useDeleteConfig,
  useToggleConfigFavorite,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/ui/DeleteConfirmButton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FavoriteButton({
  isFavorite,
  onToggle,
}: {
  isFavorite: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className={
        isFavorite
          ? "text-yellow-500"
          : "text-muted-foreground hover:text-muted-foreground/80"
      }
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className="w-5 h-5"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
        />
      </svg>
    </Button>
  );
}

function ConfigRow({
  config,
  runner,
  scorer,
  targets,
  testCases,
  maxParallel,
  deleteConfirm,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
  onToggleFavorite,
}: ConfigRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 hover:bg-muted/50">
      <div className="flex items-start gap-4">
        <div className="shrink-0 pt-0.5">
          <FavoriteButton
            isFavorite={config.isFavorite}
            onToggle={onToggleFavorite}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <Link
              to={`/configs/${config.id}`}
              className="text-lg font-semibold text-primary hover:text-primary/80 truncate"
            >
              {config.name}
            </Link>
            <span className="text-sm text-muted-foreground font-mono">
              {config.runCount} runs
            </span>
            {config.failedRunCount > 0 && (
              <span
                className="text-sm text-destructive font-mono"
                title="Failed runs since last config update"
              >
                ({config.failedRunCount} failed)
              </span>
            )}
          </div>

          {config.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
              {config.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-2">
            {runner && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {runner}
              </span>
            )}
            {scorer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {scorer.type}
              </span>
            )}
            {targets && targets.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {targets.length} target{targets.length !== 1 ? "s" : ""}
              </span>
            )}
            {testCases && testCases.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-cyan-100 text-cyan-700">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                {testCases.map((tc) => tc.storage).join(", ")}
              </span>
            )}
            {maxParallel && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-muted text-muted-foreground">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {maxParallel}x
              </span>
            )}
          </div>

          {targets && targets.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {targets.map((t, i) => (
                <span
                  key={i}
                  className="px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded border border-border"
                >
                  {t.name || t.model || `Target ${i + 1}`}
                </span>
              ))}
            </div>
          )}

          {config.tags && config.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {config.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Hide JSON" : "Show JSON"}
          </Button>
          <DeleteConfirmButton
            isConfirming={deleteConfirm === config.id}
            onRequestDelete={onDeleteClick}
            onConfirm={onDeleteConfirm}
            onCancel={onDeleteCancel}
          />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-border">
          <JsonDisplay data={config.configJson} maxHeight={300} />
        </div>
      )}
    </div>
  );
}

export function Configs() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagMode, setTagMode] = useState<"or" | "and">("or");
  const [orderBy, setOrderBy] = useState<"runCount" | "createdAt" | "name">(
    "runCount"
  );
  const [showLocalImport, setShowLocalImport] = useState(false);

  const { data: configsData, isLoading: loading } = useConfigs({
    search: search || undefined,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    tagMode: selectedTags.length > 0 ? tagMode : undefined,
    orderBy,
  });
  const configs = configsData?.configs ?? [];
  const total = configsData?.total ?? 0;
  const availableTags = configsData?.availableTags ?? [];

  const deleteConfigMutation = useDeleteConfig();
  const toggleFavoriteMutation = useToggleConfigFavorite();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const requestDelete = (id: string) => setDeleteConfirm(id);
  const confirmDelete = (id: string) => {
    deleteConfigMutation.mutate(id, {
      onSettled: () => setDeleteConfirm(null),
    });
  };
  const cancelDelete = () => setDeleteConfirm(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const clearTags = () => setSelectedTags([]);

  const handleToggleFavorite = (id: string) => {
    toggleFavoriteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Benchmark Configurations</h1>
          <p className="text-sm text-muted-foreground">
            {total} configurations
          </p>
        </div>
        <Button onClick={() => navigate("/configs/new")}>
          New Configuration
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Search</label>
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order By
                </label>
                <Select
                  value={orderBy}
                  onValueChange={(value) => setOrderBy(value as typeof orderBy)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="runCount">Most Used</SelectItem>
                    <SelectItem value="createdAt">Recently Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {availableTags.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <label className="text-sm font-medium">Filter by Tags</label>
                  {selectedTags.length > 0 && (
                    <>
                      <div className="flex items-center gap-1 text-xs">
                        <Button
                          variant={tagMode === "or" ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setTagMode("or")}
                        >
                          OR
                        </Button>
                        <Button
                          variant={tagMode === "and" ? "default" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => setTagMode("and")}
                        >
                          AND
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={clearTags}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <Button
                      key={tag}
                      variant={
                        selectedTags.includes(tag) ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 rounded-full"
                      onClick={() => toggleTag(tag)}
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {selectedTags.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">
                  Filtering by {selectedTags.length} tag
                  {selectedTags.length > 1 ? "s" : ""} ({tagMode.toUpperCase()})
                </span>
                <Button variant="link" asChild className="h-auto p-0">
                  <Link
                    to={`/leaderboard?tags=${selectedTags.join(",")}&tagMode=${tagMode}`}
                  >
                    View Leaderboard for these tags →
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading...
          </div>
        ) : configs.length > 0 ? (
          <div className="divide-y divide-border">
            {configs.map((config) => {
              const cfg = config.configJson as Record<string, unknown>;
              const runner = cfg.runner as string | undefined;
              const scorer = cfg.scorer as
                | { type: string; params?: Record<string, unknown> }
                | undefined;
              const targets = cfg.targets as
                | Array<{ provider?: string; model?: string; name?: string }>
                | undefined;
              const testCases = cfg.testCases as
                | Array<{ storage: string; params?: Record<string, unknown> }>
                | undefined;
              const maxParallel = cfg.maxParallel as number | undefined;

              return (
                <ConfigRow
                  key={config.id}
                  config={config}
                  runner={runner}
                  scorer={scorer}
                  targets={targets}
                  testCases={testCases}
                  maxParallel={maxParallel}
                  deleteConfirm={deleteConfirm}
                  onDeleteClick={() => requestDelete(config.id)}
                  onDeleteConfirm={() => confirmDelete(config.id)}
                  onDeleteCancel={cancelDelete}
                  onToggleFavorite={() => handleToggleFavorite(config.id)}
                />
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            <p>No configurations found.</p>
            <Button
              variant="link"
              onClick={() => navigate("/configs/new")}
              className="mt-2"
            >
              Create your first configuration →
            </Button>
          </div>
        )}
      </Card>

      <Card>
        <button
          onClick={() => setShowLocalImport(!showLocalImport)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${showLocalImport ? "rotate-90" : ""}`}
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
            <span className="font-medium">Import from Local Files</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {showLocalImport ? "Click to collapse" : "Click to expand"}
          </span>
        </button>
        {showLocalImport && (
          <div className="border-t border-border">
            <LocalConfigImport />
          </div>
        )}
      </Card>
    </div>
  );
}

interface ConfigRowProps {
  config: Config;
  runner?: string;
  scorer?: { type: string; params?: Record<string, unknown> };
  targets?: Array<{ provider?: string; model?: string; name?: string }>;
  testCases?: Array<{ storage: string; params?: Record<string, unknown> }>;
  maxParallel?: number;
  deleteConfirm: string | null;
  onDeleteClick: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onToggleFavorite: () => void;
}
