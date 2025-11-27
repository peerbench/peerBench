import { Prompt } from "peerbench";

interface TextReplacementProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function TextReplacement({
  prompt,
  showCorrectAnswer,
}: TextReplacementProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>
      <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded">
        <p className="text-sm text-orange-800 dark:text-orange-200 font-medium">
          Text replacement task
        </p>
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
          This question requires identifying and replacing text elements
        </p>
      </div>
      {showCorrectAnswer && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Correct replacement:
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {prompt.answer}
          </p>
        </div>
      )}
    </>
  );
}
