import { Prompt } from "peerbench";

interface OrderSentencesProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function OrderSentences({
  prompt,
  showCorrectAnswer,
}: OrderSentencesProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>
      <div className="mt-2 space-y-2">
        {Object.entries(prompt.options || {}).map(([key, value]) => (
          <div
            key={key}
            className="text-sm p-2 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded"
          >
            <span className="font-medium text-purple-700 dark:text-purple-300">
              {key}:
            </span>{" "}
            <span className="text-purple-600 dark:text-purple-400">
              {value}
            </span>
          </div>
        ))}
      </div>
      {showCorrectAnswer && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Correct order:
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {prompt.answer}
          </p>
        </div>
      )}
    </>
  );
}
