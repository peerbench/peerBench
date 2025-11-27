import { PromptResponseSchema, PromptSchema, PromptScoreSchema } from "@/types";
import { GenericArrayParser } from "./generic-array";
import { InvalidDataError } from "@/errors";

/**
 * Parser for the standard PeerBench format.
 *
 * The given data must be formatted as JSON or JSONL array of objects.
 *
 * Each object can be one of the following:
 *  - Prompt,
 *  - Response,
 *  - Score
 *
 * Prompts that are included within the Response or Score objects are counted as Prompts in the result (deduplicated).
 */
export class PBParser extends GenericArrayParser {
  static readonly identifier: string = "pb";

  constructor() {
    super({
      promptBuilder: (data) => {
        const promptValidation = PromptSchema.safeParse(data);

        // If the object is not a Prompt but a Response, then we can extract the Prompt data from it.
        if (!promptValidation.success) {
          // We only try Response object since if we are going to extract Prompt data from it,
          // we would need to full Prompt object. Score objects may not include the full Prompt data
          // but the same Response schema works for them too since Score type inherits from the Response.
          const responseValidation = PromptResponseSchema.safeParse(data);

          if (!responseValidation.success) {
            return;
          }

          return responseValidation.data.prompt;
        }

        return promptValidation.data;
      },
      responseBuilder: (data) => PromptResponseSchema.safeParse(data).data,
      scoreBuilder: (data, context) => {
        const validation = PromptScoreSchema.safeParse(data);

        if (!validation.success) {
          // If none of the objects were parsed (including Score object), that means the data wasn't in a format that we can parse
          if (!context.prompt && !context.response) {
            throw new InvalidDataError();
          }

          // Otherwise just ignore this item since it is not a valid Score object (but it was parsed as a Response or Prompt)
          return;
        }

        return validation.data;
      },
    });
  }
}
