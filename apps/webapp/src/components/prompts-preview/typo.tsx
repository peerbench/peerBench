import { Prompt } from "peerbench";

interface TypoProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function Typo({ prompt, showCorrectAnswer }: TypoProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>
      <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded">
        <p className="text-sm text-red-800 dark:text-red-200 font-medium">
          Typo detection task
        </p>
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
          This question requires identifying and correcting typos
        </p>
      </div>
      {showCorrectAnswer && (
        <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded">
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            Corrected text:
          </p>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            {prompt.answer}
          </p>
        </div>
      )}
    </>
  );
}
