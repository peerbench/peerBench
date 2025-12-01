import ModelSelect, { ModelSelectValue } from "@/components/model-select";
import { BenchmarkScoringMethods, usePageContext } from "../context";
import { isAnyProviderLoading } from "@/lib/helpers/is-any-provider-loading";

export default function SelectModelForAiScoring() {
  const ctx = usePageContext();

  const handleAiScorerModelSelected = (
    selectedModel: ModelSelectValue<false>
  ) => {
    ctx.setSelectedAiScorerModel(selectedModel);
  };

  // Determine if we should show the component and what text to display
  const shouldShow =
    (ctx.isAiScorerSelectionRequired || ctx.areThereOpenEndedPrompts) &&
    ctx.scoringMethod !== BenchmarkScoringMethods.none &&
    ctx.scoringMethod !== BenchmarkScoringMethods.human;
  const isForOpenEnded =
    ctx.areThereOpenEndedPrompts && !ctx.isAiScorerSelectionRequired;

  return (
    shouldShow && (
      <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          {isForOpenEnded
            ? "Scorer Model Selection"
            : "AI Scorer Model Selection"}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {isForOpenEnded
            ? "Open-ended typed Prompts are detected. Please select a model to use while scoring the Responses of the open-ended typed Prompts"
            : "AI scoring method is selected. Please select a model to use for AI-based scoring of the responses."}
        </p>
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-3">
            <span className="font-medium text-gray-700">
              {isForOpenEnded
                ? "Scorer Model (Required)"
                : "AI Scorer Model (Required)"}
            </span>
            <span className="text-sm text-gray-500">
              {ctx.selectedAiScorerModel
                ? `Using ${ctx.selectedAiScorerModel.modelId} from ${ctx.selectedAiScorerModel.provider}`
                : "No model selected"}
            </span>
          </div>
          <div className="space-y-5">
            <ModelSelect
              isMulti={false}
              options={ctx.modelSelectOptions}
              value={ctx.selectedAiScorerModel}
              isLoading={isAnyProviderLoading(ctx.providers)}
              onModelSelected={handleAiScorerModelSelected}
              disabled={ctx.isInputDisabled()}
            />
          </div>
        </div>
      </div>
    )
  );
}
