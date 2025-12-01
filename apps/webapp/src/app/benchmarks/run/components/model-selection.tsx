import ModelSelect, { ModelSelectValue } from "@/components/model-select";
import { usePageContext } from "../context";
import { isAnyProviderLoading } from "@/lib/helpers/is-any-provider-loading";

export default function ModelSelection() {
  const ctx = usePageContext();

  const handleModelSelection = async (models: ModelSelectValue<true>) => {
    ctx.setSelectedModels(models);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Select Models
      </h2>
      <div className="space-y-6">
        <ModelSelect
          isMulti={true}
          value={ctx.selectedModels ?? null}
          isLoading={isAnyProviderLoading(ctx.providers)}
          options={ctx.modelSelectOptions}
          onModelSelected={handleModelSelection}
          disabled={ctx.isRunning || ctx.isUploading}
        />
      </div>
    </div>
  );
}
