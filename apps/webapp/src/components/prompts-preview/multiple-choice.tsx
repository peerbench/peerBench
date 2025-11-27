import { Prompt } from "peerbench";

interface MultipleChoiceProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function MultipleChoice({
  prompt,
  showCorrectAnswer,
}: MultipleChoiceProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {Object.entries(prompt.options || {}).map(([key, value]) => (
          <div
            key={key}
            className={`text-sm p-2 rounded ${
              showCorrectAnswer && prompt.answerKey === key
                ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                : "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700"
            }`}
          >
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {key}:
            </span>{" "}
            <span
              className={`${
                showCorrectAnswer && prompt.answerKey === key
                  ? "text-green-700 dark:text-green-400"
                  : "text-blue-700 dark:text-blue-400"
              }`}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
