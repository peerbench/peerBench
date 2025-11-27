import { MaybePromise, Prompt, PromptResponse, PromptScore } from "@/types";

export abstract class AbstractParser {
  /**
   * String identifier of the parser. Must be
   * set to distinguish the parser from the others.
   */
  static readonly identifier: string = "";

  /**
   * Parses the given file
   */
  abstract parseFile(path: string): MaybePromise<ParseResult>;

  /**
   * Parses the given buffer or string
   */
  abstract parseContent(
    content: string | Uint8Array
  ): MaybePromise<ParseResult>;

  /**
   * Returns the identifier of the parser.
   */
  getIdentifier(): string | undefined {
    // The identifier can be defined either as a static class property or an instance property.
    // Recommended way is to define it as a static class property so we can access it without creating an instance.
    return (this.constructor as any)?.identifier || (this as any)?.identifier;
  }
}

export type ParseResult = {
  prompts: Prompt[];
  responses: PromptResponse[];
  scores: PromptScore[];
};
