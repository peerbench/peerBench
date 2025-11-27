import { PromptOptions } from "@/types";

/**
 * Prepares the full Prompt that is going to be sent to the model
 */
export function preparePrompt(question: string, options: PromptOptions = {}) {
  // If the options are not provided or empty, means that
  // the question is already a full prompt
  if (options && Object.keys(options).length === 0) {
    return question;
  }

  // Append answers to the full prompt
  let fullPrompt = `${question}\n\n`;
  for (const [letter, answer] of Object.entries(options)) {
    fullPrompt += `${letter}: ${answer}\n`;
  }

  return fullPrompt;
}
