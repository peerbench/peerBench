import { Prompt } from "peerbench";

interface OpenEndedProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function OpenEnded({
  prompt,
  showCorrectAnswer,
}: OpenEndedProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>

      {showCorrectAnswer && prompt.answer && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Expected answer:
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {prompt.answer}
          </p>
        </div>
      )}
    </>
  );
}
