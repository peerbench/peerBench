import { useState, useCallback, useEffect } from "react";
import { useFormContext, Controller, useFieldArray } from "react-hook-form";
import ReactSelect from "react-select";
import CreatableSelect from "react-select/creatable";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, X, KeyRound } from "lucide-react";
import { api } from "@/lib/api";
import {
  selectClassNames,
  selectStyles,
  formatOptionWithDescription,
  type DescribedOption,
} from "@/lib/react-select-styles";
import ReactMarkdown from "react-markdown";
import type { JSONSchema } from "@/lib/schema-utils";
import { providerSchemas, providerNames } from "@/lib/schema-utils";
export const ENV_MARKER = "__env";

export function SchemaForm({ schema, basePath }: SchemaFormProps) {
  if (!schema.properties || Object.keys(schema.properties).length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No additional configuration needed.
      </p>
    );
  }

  const requiredFields = schema.required || [];

  const entries = Object.entries(schema.properties);
  const simple: typeof entries = [];
  const complex: typeof entries = [];

  for (const entry of entries) {
    if (isSimpleSchema(entry[1])) {
      simple.push(entry);
    } else {
      complex.push(entry);
    }
  }

  const sorted = [...simple, ...complex];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map(([key, fieldSchema]) => (
        <div
          key={key}
          className={isSimpleSchema(fieldSchema) ? undefined : "col-span-full"}
        >
          <SchemaField
            name={key}
            fieldPath={basePath ? `${basePath}.${key}` : key}
            schema={fieldSchema}
            required={requiredFields.includes(key)}
          />
        </div>
      ))}
    </div>
  );
}

function SchemaField({ name, fieldPath, schema, required }: SchemaFieldProps) {
  const { watch, setValue } = useFormContext();
  const label = camelToTitle(name);
  const description = schema.description;
  const value = watch(fieldPath);

  const fieldElement = (() => {
    if (schema["x-render-as"] === "provider") {
      return (
        <ProviderConfigField
          name={name}
          fieldPath={fieldPath}
          schema={schema}
          required={required}
        />
      );
    }

    if (schema.anyOf || schema.oneOf) {
      return (
        <UnionField
          name={name}
          fieldPath={fieldPath}
          schema={schema}
          required={required}
        />
      );
    }

    if (schema.enum) {
      return (
        <EnumField
          label={label}
          fieldPath={fieldPath}
          schema={schema}
          required={required}
          description={description}
          defaultValue={schema.default}
        />
      );
    }

    if (schema.const !== undefined) {
      return null;
    }

    const type = schema.type;

    if (type === "string") {
      return (
        <StringField
          label={label}
          fieldPath={fieldPath}
          required={required}
          description={description}
          defaultValue={schema.default}
        />
      );
    }

    if (type === "number" || type === "integer") {
      return (
        <NumberField
          label={label}
          fieldPath={fieldPath}
          schema={schema}
          required={required}
          description={description}
          defaultValue={schema.default}
        />
      );
    }

    if (type === "boolean") {
      return (
        <BooleanField
          label={label}
          fieldPath={fieldPath}
          description={description}
          defaultValue={schema.default}
        />
      );
    }

    if (type === "object") {
      if (schema.properties && Object.keys(schema.properties).length > 0) {
        return (
          <NestedObjectField
            label={label}
            fieldPath={fieldPath}
            schema={schema}
            description={description}
          />
        );
      }
      return (
        <RecordField
          label={label}
          fieldPath={fieldPath}
          required={required}
          description={description}
        />
      );
    }

    if (type === "array") {
      return (
        <ArrayField
          label={label}
          fieldPath={fieldPath}
          schema={schema}
          description={description}
        />
      );
    }

    return (
      <RecordField
        label={label}
        fieldPath={fieldPath}
        required={required}
        description={description}
      />
    );
  })();

  if (!fieldElement) return null;

  if (required) return fieldElement;

  const isComplex =
    schema.type === "object" ||
    schema.type === "array" ||
    !!schema.anyOf ||
    !!schema.oneOf;

  const hasValue = value !== undefined && value !== null && value !== "";

  if (isComplex && !hasValue) {
    return (
      <div className="space-y-1">
        <FieldLabel label={label} />
        <FieldDescription text={description} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setValue(fieldPath, schema.type === "array" ? [{}] : {}, {
              shouldDirty: true,
            })
          }
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add {label}
        </Button>
      </div>
    );
  }

  if (isComplex) {
    return (
      <div className="relative">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setValue(fieldPath, undefined, { shouldDirty: true })}
          title={`Remove ${label}`}
          className="absolute top-0 right-0 shrink-0 text-muted-foreground hover:text-destructive z-10"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        {fieldElement}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1">
      <div className="flex-1">{fieldElement}</div>
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setValue(fieldPath, undefined)}
          title={`Clear ${label}`}
          className="shrink-0 mt-6 text-muted-foreground hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function StringField({
  label,
  fieldPath,
  required,
  description,
  defaultValue,
}: BasicFieldProps) {
  const { register, setValue, watch } = useFormContext();
  const value = watch(fieldPath);
  const isEnv = isEnvValue(value);

  const toggleEnv = () => {
    if (isEnv) {
      setValue(fieldPath, "");
    } else {
      setValue(fieldPath, {
        [ENV_MARKER]: typeof value === "string" ? value : "",
      });
    }
  };

  return (
    <div className="space-y-1">
      <FieldLabel label={label} required={required} />
      <div className="flex items-center gap-1">
        {isEnv ? (
          <>
            <KeyRound className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <EnvVarSelect
                value={value?.[ENV_MARKER] ?? ""}
                onChange={(v) => setValue(fieldPath, { [ENV_MARKER]: v })}
              />
            </div>
          </>
        ) : (
          <Input {...register(fieldPath)} placeholder={label} />
        )}
        <EnvToggleButton isEnv={isEnv} onClick={toggleEnv} />
      </div>
      <FieldDescription text={description} defaultValue={defaultValue} />
    </div>
  );
}

function NumberField({
  label,
  fieldPath,
  schema,
  required,
  description,
  defaultValue,
}: BasicFieldProps & { schema: JSONSchema }) {
  const { control, setValue, watch } = useFormContext();
  const value = watch(fieldPath);
  const isEnv = isEnvValue(value);

  const toggleEnv = () => {
    if (isEnv) {
      setValue(fieldPath, undefined);
    } else {
      setValue(fieldPath, { [ENV_MARKER]: "" });
    }
  };

  return (
    <div className="space-y-1">
      <FieldLabel label={label} required={required} />
      <div className="flex items-center gap-1">
        {isEnv ? (
          <>
            <KeyRound className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="flex-1">
              <EnvVarSelect
                value={value?.[ENV_MARKER] ?? ""}
                onChange={(v) => setValue(fieldPath, { [ENV_MARKER]: v })}
              />
            </div>
          </>
        ) : (
          <Controller
            control={control}
            name={fieldPath}
            render={({ field }) => (
              <Input
                type="number"
                step={schema.type === "integer" ? 1 : "any"}
                min={schema.minimum ?? schema.exclusiveMinimum}
                max={schema.maximum ?? schema.exclusiveMaximum}
                value={
                  typeof field.value === "number" && !isNaN(field.value)
                    ? field.value
                    : ""
                }
                onChange={(e) => {
                  const num = e.target.valueAsNumber;
                  field.onChange(isNaN(num) ? undefined : num);
                }}
                placeholder={label}
              />
            )}
          />
        )}
        <EnvToggleButton isEnv={isEnv} onClick={toggleEnv} />
      </div>
      <FieldDescription text={description} defaultValue={defaultValue} />
    </div>
  );
}

function BooleanField({
  label,
  fieldPath,
  description,
  defaultValue,
}: Omit<BasicFieldProps, "required">) {
  const { control } = useFormContext();

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Controller
          control={control}
          name={fieldPath}
          render={({ field }) => (
            <Checkbox
              id={fieldPath}
              checked={field.value === true}
              onCheckedChange={(checked) => field.onChange(checked === true)}
            />
          )}
        />
        <label htmlFor={fieldPath} className="text-sm font-medium">
          {label}
        </label>
      </div>
      <FieldDescription text={description} defaultValue={defaultValue} />
    </div>
  );
}

function EnumField({
  label,
  fieldPath,
  schema,
  required,
  description,
  defaultValue,
}: BasicFieldProps & { schema: JSONSchema }) {
  const { control } = useFormContext();
  const options = (schema.enum || []).map((opt) => ({
    value: String(opt),
    label: String(opt),
  }));

  return (
    <div className="space-y-1">
      <FieldLabel label={label} required={required} />
      <Controller
        control={control}
        name={fieldPath}
        render={({ field }) => (
          <ReactSelect
            options={options}
            value={options.find((o) => o.value === field.value) ?? null}
            onChange={(opt) => field.onChange(opt?.value ?? undefined)}
            placeholder={`Select ${label}`}
            isClearable={!required}
            classNames={selectClassNames}
            styles={selectStyles}
          />
        )}
      />
      <FieldDescription text={description} defaultValue={defaultValue} />
    </div>
  );
}

function NestedObjectField({
  label,
  fieldPath,
  schema,
  description,
}: {
  label: string;
  fieldPath: string;
  schema: JSONSchema;
  description?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <FieldDescription text={description} />
      <div className="border rounded-md p-4 space-y-4 bg-muted/30">
        <SchemaForm schema={schema} basePath={fieldPath} />
      </div>
    </div>
  );
}

function RecordField({
  label,
  fieldPath,
  required,
  description,
}: BasicFieldProps) {
  const { setValue, getValues } = useFormContext();
  const [entries, setEntries] = useState<RecordEntry[]>(() =>
    entriesFromFormValue(
      getValues(fieldPath) as Record<string, unknown> | undefined
    )
  );

  const syncToForm = useCallback(
    (updated: RecordEntry[]) => {
      setEntries(updated);
      setValue(fieldPath, entriesToFormValue(updated), { shouldDirty: true });
    },
    [fieldPath, setValue]
  );

  const addEntry = () => {
    syncToForm([...entries, { key: "", value: "", type: "string" }]);
  };

  const removeEntry = (index: number) => {
    syncToForm(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, patch: Partial<RecordEntry>) => {
    const updated = entries.map((entry, i) => {
      if (i !== index) return entry;
      const merged = { ...entry, ...patch };
      if (patch.type && patch.type !== entry.type) {
        if (patch.type === "object") merged.value = [];
        else if (patch.type === "boolean") merged.value = false;
        else if (patch.type === "number") merged.value = 0;
        else merged.value = "";
      }
      return merged;
    });
    syncToForm(updated);
  };

  return (
    <div className="space-y-2">
      <FieldLabel label={label} required={required} />
      <FieldDescription text={description} />
      <div className="space-y-2">
        {entries.map((entry, index) => (
          <RecordEntryRow
            key={index}
            entry={entry}
            depth={0}
            onUpdate={(patch) => updateEntry(index, patch)}
            onRemove={() => removeEntry(index)}
          />
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addEntry}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Field
        </Button>
      </div>
    </div>
  );
}

function RecordEntryRow({
  entry,
  depth,
  onUpdate,
  onRemove,
}: {
  entry: RecordEntry;
  depth: number;
  onUpdate: (patch: Partial<RecordEntry>) => void;
  onRemove: () => void;
}) {
  const nestedEntries =
    entry.type === "object" && Array.isArray(entry.value)
      ? (entry.value as RecordEntry[])
      : [];

  const updateNestedEntry = (index: number, patch: Partial<RecordEntry>) => {
    const updated = nestedEntries.map((e, i) => {
      if (i !== index) return e;
      const merged = { ...e, ...patch };
      if (patch.type && patch.type !== e.type) {
        if (patch.type === "object") merged.value = [];
        else if (patch.type === "boolean") merged.value = false;
        else if (patch.type === "number") merged.value = 0;
        else merged.value = "";
      }
      return merged;
    });
    onUpdate({ value: updated });
  };

  const addNestedEntry = () => {
    onUpdate({
      value: [
        ...nestedEntries,
        { key: "", value: "", type: "string" as const },
      ],
    });
  };

  const removeNestedEntry = (index: number) => {
    onUpdate({ value: nestedEntries.filter((_, i) => i !== index) });
  };

  return (
    <div
      className="border rounded-md p-3 space-y-2 bg-muted/20"
      style={depth > 0 ? { marginLeft: `${depth * 8}px` } : undefined}
    >
      <div className="flex items-center gap-2">
        <Input
          value={entry.key}
          onChange={(e) => onUpdate({ key: e.target.value })}
          placeholder="Key"
          className="flex-1 h-8 text-sm font-mono"
        />
        <select
          value={entry.type}
          onChange={(e) =>
            onUpdate({ type: e.target.value as RecordEntry["type"] })
          }
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="string">String</option>
          <option value="number">Number</option>
          <option value="boolean">Boolean</option>
          <option value="env">Env Var</option>
          <option value="object">Object</option>
        </select>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {entry.type === "string" && (
        <Input
          value={typeof entry.value === "string" ? entry.value : ""}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          className="h-8 text-sm"
        />
      )}

      {entry.type === "number" && (
        <Input
          type="number"
          value={typeof entry.value === "number" ? entry.value : ""}
          onChange={(e) => onUpdate({ value: e.target.valueAsNumber })}
          placeholder="Value"
          className="h-8 text-sm"
        />
      )}

      {entry.type === "boolean" && (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            checked={entry.value === true}
            onCheckedChange={(checked) => onUpdate({ value: checked === true })}
          />
          <span className="text-sm text-muted-foreground">
            {entry.value === true ? "true" : "false"}
          </span>
        </div>
      )}

      {entry.type === "env" && (
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0 text-amber-600" />
          <div className="flex-1">
            <EnvVarSelect
              value={typeof entry.value === "string" ? entry.value : ""}
              onChange={(v) => onUpdate({ value: v })}
            />
          </div>
        </div>
      )}

      {entry.type === "object" && (
        <div className="space-y-2 pl-2 border-l-2 border-border">
          {nestedEntries.map((nested, index) => (
            <RecordEntryRow
              key={index}
              entry={nested}
              depth={depth + 1}
              onUpdate={(patch) => updateNestedEntry(index, patch)}
              onRemove={() => removeNestedEntry(index)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={addNestedEntry}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Nested Field
          </Button>
        </div>
      )}
    </div>
  );
}

function entriesToFormValue(entries: RecordEntry[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const entry of entries) {
    if (!entry.key) continue;

    if (entry.type === "env") {
      obj[`${entry.key}:env`] = entry.value;
    } else if (entry.type === "object" && Array.isArray(entry.value)) {
      obj[entry.key] = entriesToFormValue(entry.value as RecordEntry[]);
    } else {
      obj[entry.key] = entry.value;
    }
  }
  return obj;
}

function entriesFromFormValue(
  value: Record<string, unknown> | undefined
): RecordEntry[] {
  if (!value || typeof value !== "object") return [];

  return Object.entries(value).map(([key, val]) => {
    if (key.endsWith(":env")) {
      return {
        key: key.slice(0, -4),
        value: typeof val === "string" ? val : "",
        type: "env" as const,
      };
    }
    if (typeof val === "boolean") {
      return { key, value: val, type: "boolean" as const };
    }
    if (typeof val === "number") {
      return { key, value: val, type: "number" as const };
    }
    if (typeof val === "object" && val !== null && !Array.isArray(val)) {
      return {
        key,
        value: entriesFromFormValue(val as Record<string, unknown>),
        type: "object" as const,
      };
    }
    return {
      key,
      value: typeof val === "string" ? val : String(val ?? ""),
      type: "string" as const,
    };
  });
}

function ArrayField({
  label,
  fieldPath,
  schema,
  description,
}: {
  label: string;
  fieldPath: string;
  schema: JSONSchema;
  description?: string;
}) {
  const items = schema.items;

  if (!items) {
    return (
      <RecordField
        label={label}
        fieldPath={fieldPath}
        required={false}
        description={description}
      />
    );
  }

  if (items.enum) {
    return (
      <EnumArrayField
        label={label}
        fieldPath={fieldPath}
        options={items.enum as string[]}
        description={description}
      />
    );
  }

  if (items.type === "string") {
    return (
      <StringArrayField
        label={label}
        fieldPath={fieldPath}
        description={description}
      />
    );
  }

  if (items.type === "object" && items.properties) {
    return (
      <ObjectArrayField
        label={label}
        fieldPath={fieldPath}
        itemSchema={items}
        description={description}
      />
    );
  }

  return (
    <RecordField
      label={label}
      fieldPath={fieldPath}
      required={false}
      description={description}
    />
  );
}

function EnumArrayField({
  label,
  fieldPath,
  options,
  description,
}: {
  label: string;
  fieldPath: string;
  options: string[];
  description?: string;
}) {
  const { control } = useFormContext();

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <FieldDescription text={description} />
      <Controller
        control={control}
        name={fieldPath}
        render={({ field }) => {
          const selected: string[] = Array.isArray(field.value)
            ? field.value
            : [];
          return (
            <div className="flex flex-wrap gap-3">
              {options.map((opt) => (
                <div key={opt} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`${fieldPath}-${opt}`}
                    checked={selected.includes(opt)}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        field.onChange([...selected, opt]);
                      } else {
                        field.onChange(selected.filter((s) => s !== opt));
                      }
                    }}
                  />
                  <label htmlFor={`${fieldPath}-${opt}`} className="text-sm">
                    {opt}
                  </label>
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}

function StringArrayField({
  label,
  fieldPath,
  description,
}: {
  label: string;
  fieldPath: string;
  description?: string;
}) {
  const { control } = useFormContext();

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <FieldDescription text={description} />
      <Controller
        control={control}
        name={fieldPath}
        render={({ field }) => (
          <Input
            value={Array.isArray(field.value) ? field.value.join(", ") : ""}
            onChange={(e) => {
              const parts = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              field.onChange(parts.length > 0 ? parts : undefined);
            }}
            placeholder="Comma-separated values"
          />
        )}
      />
    </div>
  );
}

function ObjectArrayField({
  label,
  fieldPath,
  itemSchema,
  description,
}: {
  label: string;
  fieldPath: string;
  itemSchema: JSONSchema;
  description?: string;
}) {
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: fieldPath,
  });

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <FieldDescription text={description} />
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="border rounded-md p-4 space-y-4 relative bg-muted/30"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {label} {index + 1}
            </span>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
          <SchemaForm schema={itemSchema} basePath={`${fieldPath}.${index}`} />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({})}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add {label}
      </Button>
    </div>
  );
}

function UnionField({
  name,
  fieldPath,
  schema,
  required,
}: {
  name: string;
  fieldPath: string;
  schema: JSONSchema;
  required: boolean;
}) {
  const { control, setValue, watch } = useFormContext();
  const label = camelToTitle(name);
  const variants = schema.anyOf || schema.oneOf || [];

  const variantOptions = variants.map((v, i) => {
    if (v.type === "string" && !v.properties) {
      return { label: "Plain text", index: i, schema: v };
    }
    const constProp = v.properties?.type;
    if (constProp?.const) {
      return {
        label: String(constProp.const),
        index: i,
        schema: v,
      };
    }
    return { label: `Variant ${i + 1}`, index: i, schema: v };
  });

  const currentValue = watch(fieldPath);
  const selectedVariantIndex = resolveVariantIndex(currentValue, variants);

  const reactSelectOptions = variantOptions.map((opt) => ({
    value: String(opt.index),
    label: opt.label,
  }));

  const handleVariantChange = (opt: { value: string } | null) => {
    if (!opt) return;
    const idx = parseInt(opt.value, 10);
    const variant = variants[idx];
    if (variant.type === "string" && !variant.properties) {
      setValue(fieldPath, "");
    } else {
      const initial: Record<string, unknown> = {};
      const constProp = variant.properties?.type;
      if (constProp?.const) {
        initial.type = constProp.const;
      }
      setValue(fieldPath, initial);
    }
  };

  return (
    <div className="space-y-2">
      <FieldLabel label={label} required={required} />
      <FieldDescription text={schema.description} />
      <ReactSelect
        options={reactSelectOptions}
        value={
          selectedVariantIndex !== null
            ? (reactSelectOptions.find(
                (o) => o.value === String(selectedVariantIndex)
              ) ?? null)
            : null
        }
        onChange={handleVariantChange}
        placeholder={`Select ${label} type`}
        classNames={selectClassNames}
        styles={selectStyles}
      />

      {selectedVariantIndex !== null &&
        (() => {
          const variant = variants[selectedVariantIndex];
          if (variant.type === "string" && !variant.properties) {
            return (
              <Controller
                control={control}
                name={fieldPath}
                render={({ field }) => (
                  <Textarea
                    value={typeof field.value === "string" ? field.value : ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    placeholder="Enter text..."
                    rows={3}
                  />
                )}
              />
            );
          }
          if (variant.type === "object" && variant.properties) {
            const filteredSchema = {
              ...variant,
              properties: Object.fromEntries(
                Object.entries(variant.properties).filter(
                  ([key, prop]) => !(key === "type" && prop.const !== undefined)
                )
              ),
            };
            if (Object.keys(filteredSchema.properties || {}).length === 0) {
              return null;
            }
            return (
              <div className="border rounded-md p-4 bg-muted/30">
                <SchemaForm schema={filteredSchema} basePath={fieldPath} />
              </div>
            );
          }
          return null;
        })()}
    </div>
  );
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      {required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );
}

function FieldDescription({
  text,
  defaultValue,
}: {
  text?: string;
  defaultValue?: unknown;
}) {
  if (!text && defaultValue === undefined) return null;
  return (
    <>
      {text && <p className="text-xs text-muted-foreground">{text}</p>}
      {defaultValue !== undefined && (
        <p className="text-xs text-muted-foreground">
          Default:{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">
            {formatDefaultValue(defaultValue)}
          </code>
        </p>
      )}
    </>
  );
}

let envVarNamesCache: string[] | null = null;
let envVarNamesFetching = false;
const envVarNamesListeners: Array<(names: string[]) => void> = [];

function useEnvVarNames() {
  const [names, setNames] = useState<string[]>(envVarNamesCache ?? []);

  useEffect(() => {
    if (envVarNamesCache !== null) {
      setNames(envVarNamesCache);
      return;
    }

    envVarNamesListeners.push(setNames);

    if (!envVarNamesFetching) {
      envVarNamesFetching = true;
      api
        .getEnvVarNames()
        .then((res) => {
          envVarNamesCache = res.names;
          for (const listener of envVarNamesListeners) {
            listener(res.names);
          }
          envVarNamesListeners.length = 0;
        })
        .catch(() => {
          envVarNamesFetching = false;
        });
    }

    return () => {
      const idx = envVarNamesListeners.indexOf(setNames);
      if (idx >= 0) envVarNamesListeners.splice(idx, 1);
    };
  }, []);

  return names;
}

function EnvVarSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const envVarNames = useEnvVarNames();
  const options = envVarNames.map((n) => ({ label: n, value: n }));
  const selected = value ? { label: value, value } : null;

  return (
    <CreatableSelect
      isClearable
      options={options}
      value={selected}
      onChange={(opt) => onChange(opt?.value ?? "")}
      onCreateOption={(input) => onChange(input)}
      placeholder="Select or type env var..."
      formatCreateLabel={(input) => `Use "${input}"`}
      classNames={{
        ...selectClassNames,
        singleValue: () => "!text-foreground font-mono",
        input: () => "!text-foreground font-mono",
      }}
      styles={selectStyles}
    />
  );
}

function EnvToggleButton({
  isEnv,
  onClick,
}: {
  isEnv: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      title={isEnv ? "Switch to literal value" : "Use environment variable"}
      className={`shrink-0 ${isEnv ? "text-amber-600 hover:text-amber-700" : "text-muted-foreground hover:text-foreground"}`}
    >
      <KeyRound className="h-3.5 w-3.5" />
    </Button>
  );
}

function formatDefaultValue(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return JSON.stringify(value);
}

function isEnvValue(value: unknown): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ENV_MARKER in value
  );
}

function isSimpleSchema(s: JSONSchema): boolean {
  if (s.enum) return true;
  return (
    s.type === "string" ||
    s.type === "number" ||
    s.type === "integer" ||
    s.type === "boolean"
  );
}

function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function resolveVariantIndex(
  value: unknown,
  variants: JSONSchema[]
): number | null {
  if (value === undefined || value === null) return null;

  if (typeof value === "string") {
    const idx = variants.findIndex((v) => v.type === "string" && !v.properties);
    return idx >= 0 ? idx : null;
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const typeVal = obj.type;
    if (typeof typeVal === "string") {
      const idx = variants.findIndex(
        (v) => v.properties?.type?.const === typeVal
      );
      if (idx >= 0) return idx;
    }
    const idx = variants.findIndex((v) => v.type === "object" && v.properties);
    return idx >= 0 ? idx : null;
  }

  return null;
}

const PROVIDER_DESC_LIMIT = 500;

const providerOptions: DescribedOption[] = providerNames.map(
  (name) => ({
    value: name,
    label: name,
    description: providerSchemas[name]?.description,
  })
);


function ProviderDescriptionBlock({
  description,
  longDescription,
}: {
  description?: string;
  longDescription?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation =
    longDescription !== undefined &&
    longDescription.length > PROVIDER_DESC_LIMIT;
  const displayedLong =
    needsTruncation && !expanded
      ? longDescription.slice(0, PROVIDER_DESC_LIMIT) + "..."
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

function ProviderConfigField({
  name,
  fieldPath,
  schema,
  required,
}: SchemaFieldProps) {
  const { watch, setValue } = useFormContext();
  const label = camelToTitle(name);
  const currentValue = watch(fieldPath);
  const selectedProvider: string | undefined = currentValue?.provider;
  const providerEntry = selectedProvider
    ? providerSchemas[selectedProvider]
    : undefined;

  return (
    <div className="space-y-2">
      <FieldLabel label={label} required={required} />
      <FieldDescription text={schema.description} />
      <ReactSelect<DescribedOption>
        options={providerOptions}
        value={
          selectedProvider
            ? (providerOptions.find((o) => o.value === selectedProvider) ??
              null)
            : null
        }
        onChange={(opt) => {
          if (opt) {
            setValue(fieldPath, { provider: opt.value }, { shouldDirty: true });
          } else {
            setValue(fieldPath, undefined, { shouldDirty: true });
          }
        }}
        placeholder={`Select ${label}`}
        isClearable={!required}
        formatOptionLabel={formatOptionWithDescription}
        classNames={selectClassNames}
        styles={selectStyles}
      />

      {selectedProvider && providerEntry && (
        <>
          <ProviderDescriptionBlock
            description={providerEntry.description}
            longDescription={providerEntry.longDescription}
          />
          <div className="border rounded-md p-4 bg-muted/30">
            <SchemaForm
              schema={providerEntry.jsonSchema}
              basePath={`${fieldPath}.params`}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface SchemaFormProps {
  schema: JSONSchema;
  basePath?: string;
}

interface SchemaFieldProps {
  name: string;
  fieldPath: string;
  schema: JSONSchema;
  required: boolean;
}

interface BasicFieldProps {
  label: string;
  fieldPath: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

interface RecordEntry {
  key: string;
  value: unknown;
  type: "string" | "number" | "boolean" | "env" | "object";
}
