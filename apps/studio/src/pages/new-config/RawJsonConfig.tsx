import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Code } from "lucide-react";
import { useCreateConfig } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreatableSelect from "react-select/creatable";
import { selectClassNames, selectStyles } from "@/lib/react-select-styles";
import { toastError } from "@/lib/toast";

export function RawJsonConfig() {
  const navigate = useNavigate();
  const createConfigMutation = useCreateConfig();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<TagOption[]>([]);
  const [rawJson, setRawJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string) => {
    setRawJson(value);
    if (!value.trim()) {
      setJsonError(null);
      return;
    }
    try {
      JSON.parse(value);
      setJsonError(null);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const canSubmit =
    name.trim().length > 0 &&
    rawJson.trim().length > 0 &&
    !jsonError &&
    !createConfigMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;

    let parsedJson: Record<string, unknown>;
    try {
      parsedJson = JSON.parse(rawJson);
    } catch {
      toastError(new Error("Invalid JSON"), "Validation error");
      return;
    }

    const tagValues = tags.map((t) => t.value);
    createConfigMutation.mutate(
      {
        name: name.trim(),
        description: description || undefined,
        configJson: parsedJson,
        tags: tagValues.length > 0 ? tagValues : undefined,
      },
      {
        onSuccess: (newConfig) => {
          navigate(`/configs/${newConfig.id}`);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My benchmark config"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this benchmark test?"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Tags</label>
            <CreatableSelect<TagOption, true>
              isMulti
              isClearable
              value={tags}
              onChange={(newValue) => setTags([...newValue])}
              placeholder="Type and press enter to add tags..."
              formatCreateLabel={(input) => `Add "${input}"`}
              classNames={selectClassNames}
              styles={selectStyles}
            />
            <p className="text-xs text-muted-foreground">
              Type a tag and press enter to add it
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4" />
            Config JSON
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={rawJson}
            onChange={(e) => handleJsonChange(e.target.value)}
            placeholder='{"runner": "...", "targets": [...], ...}'
            className="font-mono text-sm"
            rows={30}
          />
          {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Button variant="outline" onClick={() => navigate("/configs")}>
          Cancel
        </Button>
        <Button disabled={!canSubmit} onClick={handleSubmit}>
          {createConfigMutation.isPending
            ? "Creating..."
            : "Create Configuration"}
        </Button>
      </div>
    </div>
  );
}

interface TagOption {
  label: string;
  value: string;
}
