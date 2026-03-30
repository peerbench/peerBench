import { useState } from "react";
import { Link } from "react-router-dom";
import { type Trigger, type LangfuseTrigger } from "@/lib/api";
import {
  useTriggers,
  useLangfuseTriggers,
  useTriggerConfigs,
  useLangfusePrompts,
  useLangfuseStatus,
  useCreateTrigger,
  useUpdateTrigger,
  useDeleteTrigger,
  useFireTrigger,
  useCreateLangfuseTrigger,
  useUpdateLangfuseTrigger,
  useDeleteLangfuseTrigger,
  useSyncLangfuse,
} from "@/lib/queries";
import { formatTimeAgo, formatInterval } from "@/lib/format-utils";
import { Button } from "@/components/ui/button";
import { DeleteConfirmButton } from "@/components/ui/DeleteConfirmButton";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INTERVAL_PRESETS = [
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
  { label: "6 hours", value: 21600 },
  { label: "Daily", value: 86400 },
];

const DEBOUNCE_PRESETS = [
  { label: "Disabled", value: null },
  { label: "30 sec", value: 30 },
  { label: "1 min", value: 60 },
  { label: "5 min", value: 300 },
  { label: "15 min", value: 900 },
  { label: "30 min", value: 1800 },
  { label: "1 hour", value: 3600 },
];

function formatNextRun(nextRunAt: string | null): string {
  if (!nextRunAt) return "Not scheduled";
  const date = new Date(nextRunAt);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "Due now";
  if (diffMs < 60000) return `In ${Math.round(diffMs / 1000)}s`;
  if (diffMs < 3600000) return `In ${Math.round(diffMs / 60000)} min`;
  if (diffMs < 86400000) {
    const hours = Math.round(diffMs / 3600000);
    return `In ${hours} hour${hours > 1 ? "s" : ""}`;
  }
  return date.toLocaleString();
}

export function Triggers() {
  const [search, setSearch] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [triggerType, setTriggerType] = useState<TriggerType>("timed");

  const [timedForm, setTimedForm] = useState({
    name: "",
    configId: "",
    intervalSeconds: 3600,
    debounceSeconds: null as number | null,
    enabled: true,
  });

  const [langfuseForm, setLangfuseForm] = useState({
    name: "",
    promptName: "",
    configId: "",
    debounceSeconds: 30,
    enabled: true,
  });
  const [promptSearch, setPromptSearch] = useState("");
  const [showPromptDropdown, setShowPromptDropdown] = useState(false);

  const [timedDeleteConfirm, setTimedDeleteConfirm] = useState<string | null>(
    null
  );
  const [langfuseDeleteConfirm, setLangfuseDeleteConfirm] = useState<
    string | null
  >(null);

  // Query hooks with automatic polling
  const { data: timedData, isLoading: loadingTimed } = useTriggers(
    { search: search || undefined },
    { refetchInterval: 10000 }
  );
  const timedTriggers = timedData?.triggers ?? [];

  const { data: langfuseData, isLoading: loadingLangfuse } =
    useLangfuseTriggers(
      { search: search || undefined },
      { refetchInterval: 10000 }
    );
  const langfuseTriggers = langfuseData?.triggers ?? [];

  const loading = loadingTimed || loadingLangfuse;

  const { data: configsData } = useTriggerConfigs();
  const configs = configsData?.configs ?? [];

  const { data: promptsData } = useLangfusePrompts();
  const prompts = promptsData?.prompts ?? [];

  const { data: langfuseStatus } = useLangfuseStatus();
  const langfuseConfigured = langfuseStatus?.configured ?? false;

  // Mutation hooks
  const createTriggerMutation = useCreateTrigger();
  const updateTriggerMutation = useUpdateTrigger();
  const deleteTriggerMutation = useDeleteTrigger();
  const fireTriggerMutation = useFireTrigger();
  const createLangfuseTriggerMutation = useCreateLangfuseTrigger();
  const updateLangfuseTriggerMutation = useUpdateLangfuseTrigger();
  const deleteLangfuseTriggerMutation = useDeleteLangfuseTrigger();
  const syncLangfuseMutation = useSyncLangfuse();

  const submitting =
    createTriggerMutation.isPending || createLangfuseTriggerMutation.isPending;

  const unifiedTriggers: UnifiedTrigger[] = [
    ...timedTriggers.map((t) => ({ type: "timed" as const, data: t })),
    ...langfuseTriggers.map((t) => ({ type: "langfuse" as const, data: t })),
  ].sort((a, b) => {
    const aDate = new Date(a.data.updatedAt || a.data.createdAt);
    const bDate = new Date(b.data.updatedAt || b.data.createdAt);
    return bDate.getTime() - aDate.getTime();
  });

  const handleCreateTimed = (e: React.FormEvent) => {
    e.preventDefault();
    createTriggerMutation.mutate(
      {
        name: timedForm.name,
        configId: timedForm.configId,
        intervalSeconds: timedForm.intervalSeconds,
        enabled: timedForm.enabled,
        skipIfRecentRunSeconds: timedForm.debounceSeconds,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setTimedForm({
            name: "",
            configId: "",
            intervalSeconds: 3600,
            debounceSeconds: null,
            enabled: true,
          });
        },
      }
    );
  };

  const handleCreateLangfuse = (e: React.FormEvent) => {
    e.preventDefault();
    createLangfuseTriggerMutation.mutate(
      {
        name: langfuseForm.name,
        promptName: langfuseForm.promptName,
        configId: langfuseForm.configId,
        debounceSeconds: langfuseForm.debounceSeconds,
        enabled: langfuseForm.enabled,
      },
      {
        onSuccess: () => {
          setShowCreateForm(false);
          setLangfuseForm({
            name: "",
            promptName: "",
            configId: "",
            debounceSeconds: 30,
            enabled: true,
          });
        },
      }
    );
  };

  const requestTimedDelete = (id: string) => setTimedDeleteConfirm(id);
  const confirmTimedDelete = (id: string) => {
    deleteTriggerMutation.mutate(id, {
      onSettled: () => setTimedDeleteConfirm(null),
    });
  };
  const cancelTimedDelete = () => setTimedDeleteConfirm(null);

  const requestLangfuseDelete = (id: string) => setLangfuseDeleteConfirm(id);
  const confirmLangfuseDelete = (id: string) => {
    deleteLangfuseTriggerMutation.mutate(id, {
      onSettled: () => setLangfuseDeleteConfirm(null),
    });
  };
  const cancelLangfuseDelete = () => setLangfuseDeleteConfirm(null);

  const handleToggleTimed = (trigger: Trigger) => {
    updateTriggerMutation.mutate({
      id: trigger.id,
      data: { enabled: trigger.enabled === 0 },
    });
  };

  const handleToggleLangfuse = (trigger: LangfuseTrigger) => {
    updateLangfuseTriggerMutation.mutate({
      id: trigger.id,
      data: { enabled: trigger.enabled === 0 },
    });
  };

  const handleFire = (id: string) => {
    fireTriggerMutation.mutate(id);
  };

  const handleSync = () => {
    syncLangfuseMutation.mutate(undefined);
  };

  const totalCount = timedTriggers.length + langfuseTriggers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Triggers</h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} triggers ({timedTriggers.length} timed,{" "}
            {langfuseTriggers.length} Langfuse)
          </p>
        </div>
        <div className="flex gap-2">
          {langfuseConfigured && (
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncLangfuseMutation.isPending}
            >
              {syncLangfuseMutation.isPending ? "Syncing..." : "Sync Langfuse"}
            </Button>
          )}
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            New Trigger
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers..."
          />
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Trigger Type
              </label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={triggerType === "timed" ? "default" : "outline"}
                  onClick={() => setTriggerType("timed")}
                >
                  Timed (Scheduled)
                </Button>
                <Button
                  type="button"
                  variant={triggerType === "langfuse" ? "default" : "outline"}
                  onClick={() => setTriggerType("langfuse")}
                  disabled={!langfuseConfigured}
                  className={
                    triggerType === "langfuse"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : ""
                  }
                >
                  Langfuse (Prompt Change)
                </Button>
              </div>
              {!langfuseConfigured && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Langfuse triggers require LANGFUSE_PUBLIC_KEY and
                  LANGFUSE_SECRET_KEY
                </p>
              )}
            </div>

            {triggerType === "timed" ? (
              <form onSubmit={handleCreateTimed} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    type="text"
                    value={timedForm.name}
                    onChange={(e) =>
                      setTimedForm({ ...timedForm, name: e.target.value })
                    }
                    required
                    placeholder="e.g., Daily FNOL Benchmark"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Configuration
                  </label>
                  <Select
                    value={timedForm.configId || "__none__"}
                    onValueChange={(value) =>
                      setTimedForm({
                        ...timedForm,
                        configId: value === "__none__" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a configuration..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Select a configuration...
                      </SelectItem>
                      {configs.map((cfg) => (
                        <SelectItem key={cfg.id} value={cfg.id}>
                          {cfg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Run Interval
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {INTERVAL_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        type="button"
                        variant={
                          timedForm.intervalSeconds === preset.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setTimedForm({
                            ...timedForm,
                            intervalSeconds: preset.value,
                          })
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Debounce{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (skip if config ran recently)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEBOUNCE_PRESETS.map((preset) => (
                      <Button
                        key={preset.label}
                        type="button"
                        variant={
                          timedForm.debounceSeconds === preset.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          setTimedForm({
                            ...timedForm,
                            debounceSeconds: preset.value,
                          })
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="timedEnabled"
                    checked={timedForm.enabled}
                    onCheckedChange={(checked) =>
                      setTimedForm({ ...timedForm, enabled: checked === true })
                    }
                  />
                  <label htmlFor="timedEnabled" className="text-sm">
                    Enable immediately
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Trigger"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateLangfuse} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    type="text"
                    value={langfuseForm.name}
                    onChange={(e) =>
                      setLangfuseForm({ ...langfuseForm, name: e.target.value })
                    }
                    required
                    placeholder="e.g., FNOL System Prompt Changes"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium mb-1">
                    Langfuse Prompt
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={langfuseForm.promptName || promptSearch}
                      onChange={(e) => {
                        setPromptSearch(e.target.value);
                        setLangfuseForm({ ...langfuseForm, promptName: "" });
                        setShowPromptDropdown(true);
                      }}
                      onFocus={() => setShowPromptDropdown(true)}
                      placeholder={
                        prompts.length > 0
                          ? "Search prompts..."
                          : "Enter prompt name"
                      }
                    />
                  </div>
                  {showPromptDropdown &&
                    prompts.length > 0 &&
                    !langfuseForm.promptName && (
                      <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                        {prompts
                          .filter((p) =>
                            p.name
                              .toLowerCase()
                              .includes(promptSearch.toLowerCase())
                          )
                          .slice(0, 20)
                          .map((prompt) => (
                            <button
                              key={prompt.name}
                              type="button"
                              onClick={() => {
                                setLangfuseForm({
                                  ...langfuseForm,
                                  promptName: prompt.name,
                                });
                                setPromptSearch("");
                                setShowPromptDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-muted border-b border-border last:border-0"
                            >
                              <div className="font-medium">{prompt.name}</div>
                              <div className="text-xs text-muted-foreground">
                                v{Math.max(...prompt.versions)}
                              </div>
                            </button>
                          ))}
                      </div>
                    )}
                  {showPromptDropdown && (
                    <div
                      className="fixed inset-0 z-0"
                      onClick={() => setShowPromptDropdown(false)}
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Configuration
                  </label>
                  <Select
                    value={langfuseForm.configId || "__none__"}
                    onValueChange={(value) =>
                      setLangfuseForm({
                        ...langfuseForm,
                        configId: value === "__none__" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a configuration..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        Select a configuration...
                      </SelectItem>
                      {configs.map((cfg) => (
                        <SelectItem key={cfg.id} value={cfg.id}>
                          {cfg.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Debounce{" "}
                    <span className="text-xs font-normal text-muted-foreground">
                      (min time between triggers)
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DEBOUNCE_PRESETS.filter((p) => p.value !== null).map(
                      (preset) => (
                        <Button
                          key={preset.value}
                          type="button"
                          variant={
                            langfuseForm.debounceSeconds === preset.value
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className={
                            langfuseForm.debounceSeconds === preset.value
                              ? "bg-indigo-600 hover:bg-indigo-700"
                              : ""
                          }
                          onClick={() =>
                            setLangfuseForm({
                              ...langfuseForm,
                              debounceSeconds: preset.value!,
                            })
                          }
                        >
                          {preset.label}
                        </Button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="langfuseEnabled"
                    checked={langfuseForm.enabled}
                    onCheckedChange={(checked) =>
                      setLangfuseForm({
                        ...langfuseForm,
                        enabled: checked === true,
                      })
                    }
                  />
                  <label htmlFor="langfuseEnabled" className="text-sm">
                    Enable immediately
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {submitting ? "Creating..." : "Create Trigger"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading...
            </CardContent>
          </Card>
        ) : unifiedTriggers.length > 0 ? (
          unifiedTriggers.map((unified) => {
            if (unified.type === "timed") {
              const trigger = unified.data;
              return (
                <Card
                  key={`timed-${trigger.id}`}
                  className={trigger.enabled === 0 ? "opacity-60" : ""}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">
                            Timed
                          </span>
                          <h3 className="text-lg font-semibold">
                            {trigger.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${trigger.enabled === 1 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                          >
                            {trigger.enabled === 1 ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <Link
                          to={`/configs/${trigger.configId}`}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          {trigger.configName || trigger.configId.slice(0, 8)}
                          ...
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleTimed(trigger)}
                        disabled={
                          updateTriggerMutation.isPending &&
                          updateTriggerMutation.variables?.id === trigger.id
                        }
                        className={
                          trigger.enabled === 1
                            ? "text-green-600 hover:bg-green-50"
                            : "text-muted-foreground hover:bg-muted"
                        }
                      >
                        {trigger.enabled === 1 ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Interval</p>
                        <p className="font-medium">
                          {formatInterval(trigger.intervalSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Debounce</p>
                        <p className="font-medium">
                          {trigger.skipIfRecentRunSeconds
                            ? formatInterval(trigger.skipIfRecentRunSeconds)
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Run</p>
                        <p className="font-medium">
                          {formatNextRun(trigger.nextRunAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Runs</p>
                        <p className="font-medium">{trigger.runCount}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleFire(trigger.id)}
                          disabled={
                            fireTriggerMutation.isPending &&
                            fireTriggerMutation.variables === trigger.id
                          }
                        >
                          {fireTriggerMutation.isPending &&
                          fireTriggerMutation.variables === trigger.id
                            ? "Running..."
                            : "Run Now"}
                        </Button>
                        {trigger.lastRunId && (
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/runs/${trigger.lastRunId}`}>
                              Last Run
                            </Link>
                          </Button>
                        )}
                      </div>
                      <DeleteConfirmButton
                        isConfirming={timedDeleteConfirm === trigger.id}
                        onRequestDelete={() => requestTimedDelete(trigger.id)}
                        onConfirm={() => confirmTimedDelete(trigger.id)}
                        onCancel={cancelTimedDelete}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            } else {
              const trigger = unified.data;
              return (
                <Card
                  key={`langfuse-${trigger.id}`}
                  className={trigger.enabled === 0 ? "opacity-60" : ""}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-700 font-medium">
                            Langfuse
                          </span>
                          <h3 className="text-lg font-semibold">
                            {trigger.name}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${trigger.enabled === 1 ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}
                          >
                            {trigger.enabled === 1 ? "Active" : "Disabled"}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                            {trigger.promptName}
                          </span>
                        </div>
                        <Link
                          to={`/configs/${trigger.configId}`}
                          className="text-sm text-primary hover:text-primary/80"
                        >
                          {trigger.configName || trigger.configId.slice(0, 8)}
                          ...
                        </Link>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleToggleLangfuse(trigger)}
                        disabled={
                          updateLangfuseTriggerMutation.isPending &&
                          updateLangfuseTriggerMutation.variables?.id ===
                            trigger.id
                        }
                        className={
                          trigger.enabled === 1
                            ? "text-green-600 hover:bg-green-50"
                            : "text-muted-foreground hover:bg-muted"
                        }
                      >
                        {trigger.enabled === 1 ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </Button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Debounce</p>
                        <p className="font-medium">
                          {formatInterval(trigger.debounceSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Version</p>
                        <p className="font-medium">
                          {trigger.lastSeenVersion
                            ? `v${trigger.lastSeenVersion}`
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Triggered</p>
                        <p className="font-medium">
                          {formatTimeAgo(trigger.lastTriggeredAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Runs</p>
                        <p className="font-medium">{trigger.triggerCount}</p>
                      </div>
                    </div>

                    {trigger.lastRunId && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Last run:{" "}
                        </span>
                        <Link
                          to={`/runs/${trigger.lastRunId}`}
                          className="text-primary hover:text-primary/80"
                        >
                          {trigger.lastRunId.slice(0, 8)}...
                        </Link>
                        {trigger.lastRunStatus && (
                          <span
                            className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                              trigger.lastRunStatus === "completed"
                                ? "bg-green-100 text-green-700"
                                : trigger.lastRunStatus === "running"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {trigger.lastRunStatus}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
                      <DeleteConfirmButton
                        isConfirming={langfuseDeleteConfirm === trigger.id}
                        onRequestDelete={() =>
                          requestLangfuseDelete(trigger.id)
                        }
                        onConfirm={() => confirmLangfuseDelete(trigger.id)}
                        onCancel={cancelLangfuseDelete}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            }
          })
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No triggers configured.</p>
              <Button
                variant="link"
                onClick={() => setShowCreateForm(true)}
                className="mt-2"
              >
                Create your first trigger
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

type TriggerType = "timed" | "langfuse";

type UnifiedTrigger =
  | { type: "timed"; data: Trigger }
  | { type: "langfuse"; data: LangfuseTrigger };
