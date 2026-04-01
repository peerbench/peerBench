import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toastError } from "@/lib/toast";
import { ExpandableCard } from "@/components/ui/ExpandableCard";

function TypeBadge({ type, values }: { type: string; values?: string[] }) {
  const colors: Record<string, string> = {
    string: "bg-green-100 text-green-700",
    number: "bg-blue-100 text-blue-700",
    boolean: "bg-yellow-100 text-yellow-700",
    array: "bg-purple-100 text-purple-700",
    object: "bg-orange-100 text-orange-700",
    enum: "bg-pink-100 text-pink-700",
    "string[]": "bg-purple-100 text-purple-700",
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-mono rounded ${colors[type] || "bg-muted text-muted-foreground"}`}>
      {type}
      {values && values.length > 0 && (
        <span className="text-xs opacity-75 ml-1">
          [{values.join(" | ")}]
        </span>
      )}
    </span>
  );
}

function FieldRow({ name, field, indent = 0 }: { name: string; field: FieldDef; indent?: number }) {
  return (
    <div className={`py-2 ${indent > 0 ? "border-l-2 border-border ml-4 pl-4" : ""}`}>
      <div className="flex items-start gap-3">
        <code className="text-sm font-semibold">{name}</code>
        <TypeBadge type={field.type} values={field.values} />
        {field.required && (
          <span className="text-xs text-destructive font-medium">required</span>
        )}
      </div>
      {field.description && (
        <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
      )}
      {field.items && (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-1">Item fields:</p>
          {Object.entries(field.items).map(([itemName, itemField]) => (
            <FieldRow key={itemName} name={itemName} field={itemField} indent={indent + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaSection({ title, schema, color }: { title: string; schema?: Record<string, FieldDef>; color: string }) {
  if (!schema || Object.keys(schema).length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className={`text-sm font-semibold ${color} mb-3 flex items-center gap-2`}>
        <span className={`w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`}></span>
        {title}
      </h4>
      <div className="bg-muted/50 rounded-lg p-4 divide-y divide-border">
        {Object.entries(schema).map(([name, field]) => (
          <FieldRow key={name} name={name} field={field} />
        ))}
      </div>
    </div>
  );
}

function SchemaCardHeader({ schema }: { schema: SchemaSet }) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-semibold">{schema.name}</h3>
        <span className="px-2 py-0.5 text-xs font-mono bg-muted text-muted-foreground rounded">
          v{schema.version}
        </span>
      </div>
      <code className="text-sm text-primary font-mono">{schema.kind}</code>
    </div>
  );
}

function SchemaCardBody({ schema }: { schema: SchemaSet }) {
  return (
    <>
      <SchemaSection
        title="Test Case Schema (Input)"
        schema={schema.testCaseSchema}
        color="text-blue-700"
      />
      <SchemaSection
        title="Response Schema (Output)"
        schema={schema.responseSchema}
        color="text-green-700"
      />
      <SchemaSection
        title="Score Schema (Evaluation)"
        schema={schema.scoreSchema}
        color="text-purple-700"
      />
    </>
  );
}

export function Schemas() {
  const [schemas, setSchemas] = useState<SchemaSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api.getBenchmarkMeta()
      .then((data) => {
        setSchemas(data.schemaSets || []);
      })
      .catch((err) => {
        toastError(err, "Failed to load schemas");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading schemas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Test Case Schemas</h1>
        <p className="text-muted-foreground mt-1">
          Available data schemas for benchmark test cases. Click to view field definitions.
        </p>
      </div>

      <div className="space-y-4">
        {schemas.map((schema) => (
          <ExpandableCard
            key={schema.id}
            isExpanded={expandedId === schema.id}
            onToggle={() => setExpandedId(expandedId === schema.id ? null : schema.id)}
            header={<SchemaCardHeader schema={schema} />}
            description={schema.description}
          >
            <SchemaCardBody schema={schema} />
          </ExpandableCard>
        ))}
      </div>

      {schemas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No schemas available.
        </div>
      )}
    </div>
  );
}

interface FieldDef {
  type: string;
  required?: boolean;
  description?: string;
  values?: string[];
  items?: Record<string, FieldDef>;
}

interface SchemaSet {
  id: string;
  kind: string;
  name: string;
  description: string;
  version: number;
  testCaseFields: string[];
  testCaseSchema?: Record<string, FieldDef>;
  responseSchema?: Record<string, FieldDef>;
  scoreSchema?: Record<string, FieldDef>;
}
