import { Prompt } from "peerbench";

interface UnknownProps {
  prompt: Prompt;
  showCorrectAnswer: boolean;
}

export default function Unknown({ prompt, showCorrectAnswer }: UnknownProps) {
  return (
    <>
      <p className="font-medium text-gray-800 dark:text-gray-200">
        {prompt.prompt}
      </p>
      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Unknown prompt type: {prompt.type}
        </p>
        {showCorrectAnswer && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
            Answer: {prompt.answer}
          </p>
        )}
      </div>
    </>
  );
}
