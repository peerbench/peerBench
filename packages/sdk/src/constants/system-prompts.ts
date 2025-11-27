export const MULTIPLE_CHOICE_SYSTEM_PROMPT_JSON_BASED = `You are a knowledgeable expert. Answer the given question with one of the given options.
INSTRUCTIONS:
* Output valid JSON only.
* Select the letter of the answer that is correct.
* Do not include any additional text, reasoning, formatting or explanation in your response except the JSON object specified below.
* Strictly follow the JSON schema below:
{ "answer": "<answer letter>" }`;
export const MULTIPLE_CHOICE_SYSTEM_PROMPT_PATTERN_BASED = `Your explanation can't be longer than 400 tokens. The last sentence must be formatted as one of the following:
- The answer is <answer letter>
- The answer is **<answer letter>**
- <answer letter>: ...
- <answer letter>) ...
Replace <answer letter> with the letter of your chosen answer.

Use the following string as your last sentence if you are not capable of answering the question:
<!NO ANSWER!>`;

export const SENTENCE_REORDER_SYSTEM_PROMPT =
  "Your task is ordering the given sentences (each line is a sentence) in a correct order. Your output must be formatted as the input but with the sentences in the correct order. Markdown formatting is forbidden.";

export const TEXT_REPLACEMENT_SYSTEM_PROMPT =
  "Your task is placing all the entities that are provided in the ENTITIES section to the input text in a correct order. Your output only and only includes the modified text, nothing else. It is forbidden to modify anything else from the input text. Markdown formatting is forbidden too.";

export const TYPO_SYSTEM_PROMPT =
  "Your task is to find all the typos in the given text. Your output must include the corrected text, nothing else.";

export const OPEN_ENDED_SYSTEM_PROMPT =
  "You are a knowledgeable expert. Please provide a clear, accurate, short and well-reasoned answer to the following question. Be concise but comprehensive in your response. Your answer must be short and clear with less than 20 words";
