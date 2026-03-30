import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  useForm,
  useFormContext,
  useFieldArray,
  FormProvider,
  Controller,
  type FieldErrors,
} from "react-hook-form";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  Play,
  Target,
  Database,
  Award,
  Settings,
  Code,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useCreateConfig } from "@/lib/queries";
import {
  runnerSchemas,
  runnerNames,
  runnerCompatibility,
  providerSchemas,
  providerNames,
  storageSchemas,
  storageNames,
  scorerSchemas,
  scorerNames,
} from "@/lib/schema-utils";
import { SchemaForm, ENV_MARKER } from "@/components/SchemaForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ReactSelect from "react-select";
import CreatableSelect from "react-select/creatable";
import {
  selectClassNames,
  selectStyles,
  selectStylesWithError,
  formatOptionWithDescription,
  type DescribedOption,
} from "@/lib/react-select-styles";
import { toastError, toastSuccess } from "@/lib/toast";

const runnerOptions = runnerNames.map((name) => ({
  value: name,
  label: name,
  description: runnerSchemas[name]?.description,
}));

const scorerOptions = scorerNames.map((name) => ({
  value: name,
  label: name,
  description: scorerSchemas[name]?.description,
}));

const providerOptions = providerNames.map((name) => ({
  value: name,
  label: name,
  description: providerSchemas[name]?.description,
}));

const storageOptions = storageNames.map((name) => ({
  value: name,
  label: name,
  description: storageSchemas[name]?.description,
}));

export function ConfigForm() {
  const navigate = useNavigate();
  const createConfigMutation = useCreateConfig();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const methods = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      tags: [],
      runner: "",
      runnerParams: {},
      targets: [{ provider: "", name: "", params: {} }],
      testCases: [{ storage: "", params: {} }],
      scorerEnabled: false,
      scorerType: "",
      scorerParams: {},
      maxParallel: 20,
      metadata: "",
    },
  });

  const {
    control,
    register,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = methods;

  const targetsArray = useFieldArray({ control, name: "targets" });
  const testCasesArray = useFieldArray({ control, name: "testCases" });

  const runner = watch("runner");
  const scorerEnabled = watch("scorerEnabled");
  const scorerType = watch("scorerType");
  const allValues = watch();

  const compat = runner ? runnerCompatibility[runner] : undefined;
  const hasNoScorers =
    compat !== undefined && compat.supportedScorers.length === 0;
  const hasNoStorages =
    compat !== undefined && compat.supportedStorages.length === 0;

  const filteredScorerOptions = useMemo(() => {
    const c = runner ? runnerCompatibility[runner] : undefined;
    if (!c) return scorerOptions;
    return scorerOptions.filter((o) => c.supportedScorers.includes(o.value));
  }, [runner]);

  const filteredStorageOptions = useMemo(() => {
    const c = runner ? runnerCompatibility[runner] : undefined;
    if (!c) return storageOptions;
    return storageOptions.filter((o) => c.supportedStorages.includes(o.value));
  }, [runner]);

  const configJson = useMemo(() => buildConfigJson(allValues), [allValues]);

  const handleRunnerChange = (newRunner: string) => {
    setValue("runnerParams", {});
    const c = newRunner ? runnerCompatibility[newRunner] : undefined;
    if (!c) return;

    if (c.supportedScorers.length === 0) {
      setValue("scorerEnabled", false);
      setValue("scorerType", "");
      setValue("scorerParams", {});
    } else {
      const currentScorer = getValues("scorerType");
      if (currentScorer && !c.supportedScorers.includes(currentScorer)) {
        setValue("scorerType", "");
        setValue("scorerParams", {});
      }
    }

    const testCases = getValues("testCases");
    for (let i = 0; i < testCases.length; i++) {
      if (
        testCases[i].storage &&
        !c.supportedStorages.includes(testCases[i].storage)
      ) {
        setValue(`testCases.${i}.storage`, "");
        setValue(`testCases.${i}.params`, {});
      }
    }
  };

  const onInvalid = (fieldErrors: FieldErrors<FormValues>) => {
    const messages: string[] = [];
    if (fieldErrors.name)
      messages.push(fieldErrors.name.message ?? "Name is required");
    if (fieldErrors.runner)
      messages.push(fieldErrors.runner.message ?? "Runner is required");
    if (fieldErrors.targets) {
      const targetErrors = fieldErrors.targets;
      if (Array.isArray(targetErrors)) {
        targetErrors.forEach((te, i) => {
          if (te?.provider) {
            messages.push(
              `Target ${i + 1}: ${te.provider.message ?? "Provider is required"}`
            );
          }
        });
      }
    }
    if (fieldErrors.testCases) {
      const tcErrors = fieldErrors.testCases;
      if (Array.isArray(tcErrors)) {
        tcErrors.forEach((tc, i) => {
          if (tc?.storage) {
            messages.push(
              `Source ${i + 1}: ${tc.storage.message ?? "Storage is required"}`
            );
          }
        });
      }
    }
    toastError(
      new Error(messages.join("\n")),
      "Please fix the following errors"
    );
  };

  const onSubmit = (data: FormValues) => {
    const json = buildConfigJson(data);
    const tags = data.tags.map((t) => t.value);

    createConfigMutation.mutate(
      {
        name: data.name,
        description: data.description || undefined,
        configJson: json,
        tags: tags.length > 0 ? tags : undefined,
      },
      {
        onSuccess: (newConfig) => {
          navigate(`/configs/${newConfig.id}`);
        },
      }
    );
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(configJson, null, 2));
    toastSuccess("JSON copied to clipboard");
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                {...register("name", { required: "Name is required" })}
                placeholder="My benchmark config"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Description</label>
              <Textarea
                {...register("description")}
                placeholder="What does this benchmark test?"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium">Tags</label>
              <Controller
                control={control}
                name="tags"
                render={({ field }) => (
                  <CreatableSelect<TagOption, true>
                    isMulti
                    isClearable
                    value={field.value}
                    onChange={(newValue) => field.onChange([...newValue])}
                    placeholder="Type and press enter to add tags..."
                    formatCreateLabel={(input) => `Add "${input}"`}
                    classNames={selectClassNames}
                    styles={selectStyles}
                  />
                )}
              />
              <p className="text-xs text-muted-foreground">
                Type a tag and press enter to add it
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Runner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Play className="h-4 w-4" />
              Runner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Runner <span className="text-destructive">*</span>
              </label>
              <Controller
                control={control}
                name="runner"
                rules={{ required: "Runner is required" }}
                render={({ field }) => (
                  <ReactSelect<DescribedOption>
                    options={runnerOptions}
                    value={
                      field.value
                        ? (runnerOptions.find((o) => o.value === field.value) ??
                          null)
                        : null
                    }
                    onChange={(opt) => {
                      field.onChange(opt?.value ?? "");
                      handleRunnerChange(opt?.value ?? "");
                    }}
                    placeholder="Select a runner"
                    isClearable
                    formatOptionLabel={formatOptionWithDescription}
                    classNames={selectClassNames}
                    styles={selectStylesWithError(!!errors.runner)}
                  />
                )}
              />
              {errors.runner && (
                <p className="text-xs text-destructive">
                  {errors.runner.message}
                </p>
              )}
            </div>

            {runner && runnerSchemas[runner] && (
              <>
                <DescriptionBlock
                  description={runnerSchemas[runner].description}
                  longDescription={runnerSchemas[runner].longDescription}
                />
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Runner Parameters
                  </h4>
                  <SchemaForm
                    schema={runnerSchemas[runner].jsonSchema}
                    basePath="runnerParams"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Targets
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Define one or more targets to evaluate. Each target specifies a
              provider and its parameters.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {targetsArray.fields.map((field, index) => (
              <TargetItem
                key={field.id}
                index={index}
                canRemove={targetsArray.fields.length > 1}
                onRemove={() => targetsArray.remove(index)}
              />
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                targetsArray.append({ provider: "", name: "", params: {} })
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Target
            </Button>
          </CardContent>
        </Card>

        {/* Test Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Test Cases
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Define one or more test case sources. Each source specifies a
              storage and its parameters.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasNoStorages ? (
              <p className="text-sm text-muted-foreground">
                This runner does not require test case sources.
              </p>
            ) : (
              <>
                {testCasesArray.fields.map((field, index) => (
                  <TestCaseItem
                    key={field.id}
                    index={index}
                    canRemove={testCasesArray.fields.length > 1}
                    onRemove={() => testCasesArray.remove(index)}
                    storageOptions={filteredStorageOptions}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    testCasesArray.append({ storage: "", params: {} })
                  }
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Test Case Source
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Scorer */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4" />
              Scorer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasNoScorers ? (
              <p className="text-sm text-muted-foreground">
                This runner does not support scoring.
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Controller
                    control={control}
                    name="scorerEnabled"
                    render={({ field }) => (
                      <Checkbox
                        id="scorerEnabled"
                        checked={field.value === true}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                      />
                    )}
                  />
                  <label
                    htmlFor="scorerEnabled"
                    className="text-sm font-medium"
                  >
                    Enable Scorer
                  </label>
                </div>

                {scorerEnabled && (
                  <>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium">
                        Scorer Type <span className="text-destructive">*</span>
                      </label>
                      <Controller
                        control={control}
                        name="scorerType"
                        render={({ field }) => (
                          <ReactSelect<DescribedOption>
                            options={filteredScorerOptions}
                            value={
                              field.value
                                ? (filteredScorerOptions.find(
                                    (o) => o.value === field.value
                                  ) ?? null)
                                : null
                            }
                            onChange={(opt) => {
                              field.onChange(opt?.value ?? "");
                              setValue("scorerParams", {});
                            }}
                            placeholder="Select a scorer"
                            isClearable
                            formatOptionLabel={formatOptionWithDescription}
                            classNames={selectClassNames}
                            styles={selectStyles}
                          />
                        )}
                      />
                    </div>

                    {scorerType && scorerSchemas[scorerType] && (
                      <>
                        <DescriptionBlock
                          description={scorerSchemas[scorerType].description}
                          longDescription={
                            scorerSchemas[scorerType].longDescription
                          }
                        />
                        <div>
                          <h4 className="text-sm font-medium mb-2">
                            Scorer Parameters
                          </h4>
                          <SchemaForm
                            schema={scorerSchemas[scorerType].jsonSchema}
                            basePath="scorerParams"
                          />
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Advanced */}
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <div className="flex items-center gap-2">
              {showAdvanced ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Advanced Settings
              </CardTitle>
            </div>
          </CardHeader>
          {showAdvanced && (
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium">
                  Max Parallel
                </label>
                <Input
                  type="number"
                  min={1}
                  {...register("maxParallel", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum parallel executions shared between all targets.
                  Default: 20.
                </p>
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium">Metadata</label>
                <Textarea
                  {...register("metadata")}
                  placeholder='{"key": "value"}'
                  className="font-mono text-sm"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Arbitrary JSON metadata attached to the config.
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* JSON Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Code className="h-4 w-4" />
                JSON Preview
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={copyJson}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted rounded-md p-4 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(configJson, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Action Bar */}
        <div className="flex items-center justify-end gap-3 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/configs")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={createConfigMutation.isPending}>
            {createConfigMutation.isPending
              ? "Creating..."
              : "Create Configuration"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

function TargetItem({
  index,
  canRemove,
  onRemove,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormValues>();
  const provider = watch(`targets.${index}.provider`);
  const providerError = errors.targets?.[index]?.provider;

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Target {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium">
            Provider <span className="text-destructive">*</span>
          </label>
          <Controller
            control={control}
            name={`targets.${index}.provider`}
            rules={{ required: "Provider is required" }}
            render={({ field }) => (
              <ReactSelect<DescribedOption>
                options={providerOptions}
                value={
                  field.value
                    ? (providerOptions.find((o) => o.value === field.value) ??
                      null)
                    : null
                }
                onChange={(opt) => {
                  field.onChange(opt?.value ?? "");
                  setValue(`targets.${index}.params`, {});
                }}
                placeholder="Select provider"
                isClearable
                formatOptionLabel={formatOptionWithDescription}
                classNames={selectClassNames}
                styles={selectStylesWithError(!!providerError)}
              />
            )}
          />
          {providerError && (
            <p className="text-xs text-destructive">{providerError.message}</p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Display Name</label>
          <Input
            {...register(`targets.${index}.name`)}
            placeholder="e.g. GPT-4o Production"
          />
        </div>
      </div>

      {provider && providerSchemas[provider] && (
        <>
          <p className="text-xs text-muted-foreground">
            {providerSchemas[provider].description}
          </p>
          {providerSchemas[provider].longDescription && (
            <Accordion
              type="single"
              collapsible
              className="rounded-md border px-3"
            >
              <AccordionItem value="docs" className="border-none">
                <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:text-foreground hover:no-underline">
                  Detailed documentation
                </AccordionTrigger>
                <AccordionContent>
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>
                      {providerSchemas[provider].longDescription!}
                    </ReactMarkdown>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <div>
            <h4 className="text-sm font-medium mb-2">Provider Parameters</h4>
            <SchemaForm
              schema={providerSchemas[provider].jsonSchema}
              basePath={`targets.${index}.params`}
            />
          </div>
        </>
      )}
    </div>
  );
}

function TestCaseItem({
  index,
  canRemove,
  onRemove,
  storageOptions,
}: {
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  storageOptions: DescribedOption[];
}) {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<FormValues>();
  const storage = watch(`testCases.${index}.storage`);
  const storageError = errors.testCases?.[index]?.storage;

  return (
    <div className="border rounded-md p-4 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Source {index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Storage <span className="text-destructive">*</span>
        </label>
        <Controller
          control={control}
          name={`testCases.${index}.storage`}
          rules={{ required: "Storage is required" }}
          render={({ field }) => (
            <ReactSelect<DescribedOption>
              options={storageOptions}
              value={
                field.value
                  ? (storageOptions.find((o) => o.value === field.value) ??
                    null)
                  : null
              }
              onChange={(opt) => {
                field.onChange(opt?.value ?? "");
                setValue(`testCases.${index}.params`, {});
              }}
              placeholder="Select storage"
              isClearable
              formatOptionLabel={formatOptionWithDescription}
              classNames={selectClassNames}
              styles={selectStylesWithError(!!storageError)}
            />
          )}
        />
        {storageError && (
          <p className="text-xs text-destructive">{storageError.message}</p>
        )}
      </div>

      {storage && storageSchemas[storage] && (
        <>
          <DescriptionBlock
            description={storageSchemas[storage].description}
            longDescription={storageSchemas[storage].longDescription}
          />
          <div>
            <h4 className="text-sm font-medium mb-2">Storage Parameters</h4>
            <SchemaForm
              schema={storageSchemas[storage].jsonSchema}
              basePath={`testCases.${index}.params`}
            />
          </div>
        </>
      )}
    </div>
  );
}

const LONG_DESC_LIMIT = 500;

function DescriptionBlock({
  description,
  longDescription,
}: {
  description?: string;
  longDescription?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation =
    longDescription !== undefined && longDescription.length > LONG_DESC_LIMIT;
  const displayedLong =
    needsTruncation && !expanded
      ? longDescription.slice(0, LONG_DESC_LIMIT) + "..."
      : longDescription;

  return (
    <div className="prose prose-sm max-w-none space-y-3">
      {description && <ReactMarkdown>{`**${description}**`}</ReactMarkdown>}
      {displayedLong && (
        <span className="inline text-xs text-muted-foreground">
          <ReactMarkdown
            components={{
              p: ({ children }) => <span>{children} </span>,
            }}
          >
            {displayedLong}
          </ReactMarkdown>
          {needsTruncation && (
            <button
              type="button"
              className="text-xs text-primary hover:underline cursor-pointer inline"
              onClick={() => setExpanded((prev) => !prev)}
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </span>
      )}
    </div>
  );
}

function buildConfigJson(data: FormValues): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (data.runner) {
    config.runner = data.runner;
  }

  if (data.description) {
    config.description = data.description;
  }

  const targets = data.targets
    .filter((t) => t.provider)
    .map((t) => {
      const target: Record<string, unknown> = { provider: t.provider };
      if (t.name) target.name = t.name;
      const params = cleanObject(t.params);
      if (params && Object.keys(params).length > 0) target.params = params;
      return target;
    });
  if (targets.length > 0) {
    config.targets = targets;
  }

  const testCases = data.testCases
    .filter((tc) => tc.storage)
    .map((tc) => {
      const source: Record<string, unknown> = { storage: tc.storage };
      const params = cleanObject(tc.params);
      if (params && Object.keys(params).length > 0) source.params = params;
      return source;
    });
  if (testCases.length > 0) {
    config.testCases = testCases;
  }

  if (data.scorerEnabled && data.scorerType) {
    const scorer: Record<string, unknown> = { type: data.scorerType };
    const params = cleanObject(data.scorerParams);
    if (params && Object.keys(params).length > 0) scorer.params = params;
    config.scorer = scorer;
  }

  const runnerParams = cleanObject(data.runnerParams);
  if (runnerParams && Object.keys(runnerParams).length > 0) {
    config.runnerParams = runnerParams;
  }

  if (data.maxParallel && data.maxParallel !== 20) {
    config.maxParallel = data.maxParallel;
  }

  if (data.metadata) {
    try {
      const parsed = JSON.parse(data.metadata);
      if (typeof parsed === "object" && parsed !== null) {
        config.metadata = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return config;
}

function cleanObject(
  obj: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!obj) return undefined;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === "" || value === null) continue;
    if (typeof value === "number" && isNaN(value)) continue;
    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      const record = value as Record<string, unknown>;
      if (ENV_MARKER in record && typeof record[ENV_MARKER] === "string") {
        const envName = record[ENV_MARKER] as string;
        if (envName) {
          cleaned[`${key}:env`] = envName;
        }
        continue;
      }
      const nested = cleanObject(record);
      if (nested && Object.keys(nested).length > 0) {
        cleaned[key] = nested;
      }
      continue;
    }
    cleaned[key] = value;
  }
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

interface TagOption {
  label: string;
  value: string;
}

interface FormValues {
  name: string;
  description: string;
  tags: TagOption[];
  runner: string;
  runnerParams: Record<string, unknown>;
  targets: Array<{
    provider: string;
    name: string;
    params: Record<string, unknown>;
  }>;
  testCases: Array<{
    storage: string;
    params: Record<string, unknown>;
  }>;
  scorerEnabled: boolean;
  scorerType: string;
  scorerParams: Record<string, unknown>;
  maxParallel: number;
  metadata: string;
}
