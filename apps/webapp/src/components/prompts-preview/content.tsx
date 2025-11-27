import { LucideLoader2, LucideHash } from "lucide-react";
import { NavigationControls } from "../navigation-controls";
import { InfoSection } from "../entity-preview/info-section";
import { InfoField } from "../entity-preview/info-field";
import { Prompt, PromptTypes } from "peerbench";
import MultipleChoice from "./multiple-choice";
import OpenEnded from "./open-ended";
import OrderSentences from "./order-sentences";
import TextReplacement from "./text-replacement";
import Typo from "./typo";
import Unknown from "./unknown";

export function Content({
  isLoading,
  prompts,
  currentIndex,
  showCorrectAnswer,
  onPrevious,
  onNext,
}: {
  isLoading: boolean;
  prompts: Prompt[];
  currentIndex: number;
  showCorrectAnswer: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const safeIndex = Math.min(currentIndex, Math.max(0, prompts.length - 1));
  const currentPrompt = prompts[safeIndex];

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <LucideLoader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading prompts...</p>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No prompts available</p>
        </div>
      ) : currentPrompt ? (
        <div className="space-y-4">
          <NavigationControls
            currentIndex={safeIndex}
            total={prompts.length}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            {/* Prompt UUID */}
            <InfoSection title="Prompt Information">
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="col-span-2">
                  <span className="text-gray-500 dark:text-gray-400">
                    UUID:
                  </span>{" "}
                  <span className="inline-flex items-center gap-1 text-gray-900 dark:text-gray-100">
                    <LucideHash size={12} />
                    <span className="font-mono">
                      {currentPrompt.promptUUID}
                    </span>
                  </span>
                </div>
                <InfoField label="Type" value={currentPrompt.type} spanFull />
              </div>
            </InfoSection>

            {/* Prompt Content */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Prompt
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 border border-gray-200 dark:border-gray-700">
                <PromptRenderer
                  prompt={currentPrompt}
                  showCorrectAnswer={showCorrectAnswer}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Component to render different prompt types
function PromptRenderer({
  prompt,
  showCorrectAnswer,
}: {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}) {
  // Render based on prompt type
  switch (prompt.type) {
    case PromptTypes.MultipleChoice:
      return (
        <MultipleChoice prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.OpenEnded:
      return (
        <OpenEnded prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.OrderSentences:
      return (
        <OrderSentences prompt={prompt} showCorrectAnswer={showCorrectAnswer} />
      );
    case PromptTypes.TextReplacement:
      return (
        <TextReplacement
          prompt={prompt}
          showCorrectAnswer={showCorrectAnswer}
        />
      );
    case PromptTypes.Typo:
      return <Typo prompt={prompt} showCorrectAnswer={showCorrectAnswer} />;
    default:
      // Fallback for unknown types
      return <Unknown prompt={prompt} showCorrectAnswer={showCorrectAnswer} />;
  }
}
