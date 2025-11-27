import { bufferToString, parseJSONL, readFile, tryParseJson } from "@/utils";
import { AbstractParser, ParseResult } from "./abstract-parser";
import { InvalidDataError } from "@/errors/parser";
import { MaybePromise, Prompt, PromptResponse, PromptScore } from "@/types";

/**
 * Generic parser for the contents that formatted as JSON or JSONL array of objects.
 *
 * It uses the given builder functions to build the Prompt, Response,
 * and Score objects for the each object from the data that is parsed from the file/content.
 *
 * It also prevents having same Prompts with different IDs using the
 * `fullPromptCID` of the produced Prompt objects.
 */
export class GenericArrayParser extends AbstractParser {
  static readonly identifier: string = "generic-array";

  private promptBuilder: GenericArrayParserPromptBuilder;
  private responseBuilder?: GenericArrayParserResponseBuilder;
  private scoreBuilder?: GenericArrayParserScoreBuilder;
  constructor(options: {
    promptBuilder: GenericArrayParserPromptBuilder;
    responseBuilder?: GenericArrayParserResponseBuilder;
    scoreBuilder?: GenericArrayParserScoreBuilder;
  }) {
    super();
    this.promptBuilder = options.promptBuilder;
    this.responseBuilder = options.responseBuilder;
    this.scoreBuilder = options.scoreBuilder;
  }

  async parseFile(path: string): Promise<ParseResult> {
    const content = await readFile(path);
    return this.parseContent(content);
  }

  async parseContent(content: string | Uint8Array): Promise<ParseResult> {
    let data: unknown[] | undefined;

    // Convert ArrayBuffer to string if needed
    const contentString =
      typeof content === "string" ? content : bufferToString(content);

    // Try to parse it as JSON or JSONL
    data = tryParseJson(contentString);
    if (!data) {
      data = parseJSONL(contentString);
    }

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new InvalidDataError();
    }

    const includedPromptCIDs: Record<string, string> = {};
    const includedResponseDIDs: Record<string, string> = {};
    const includedScoreDIDs: Record<string, string> = {};
    const result: ParseResult = {
      prompts: [],
      responses: [],
      scores: [],
    };

    for (const item of data) {
      const prompt = await this.promptBuilder(item, { result });
      let response: PromptResponse | undefined;
      let score: PromptScore | undefined;

      if (prompt) {
        // Only add this Prompt object to the result if the `fullPrompt` is not produced before.
        if (!includedPromptCIDs[prompt.fullPromptCID]) {
          includedPromptCIDs[prompt.fullPromptCID] = prompt.promptUUID;
          result.prompts.push(prompt);
        }
      }

      if (this.responseBuilder) {
        response = await this.responseBuilder(item, { result, prompt });
        if (response) {
          // If the Prompt used in the Response object is already produced before,
          // use that object. This prevents having the same Prompt with different properties
          // within the Response objects.
          if (includedPromptCIDs[response.prompt.fullPromptCID]) {
            const cid = response.prompt.fullPromptCID;
            response.prompt = result.prompts.find(
              (p) => p.fullPromptCID === cid
            )!;
          }

          // Only add this Response object if it is not in the result array yet.
          if (!includedResponseDIDs[response.responseUUID]) {
            includedResponseDIDs[response.responseUUID] = response.responseUUID;
            result.responses.push(response);
          }
        }
      }

      if (this.scoreBuilder) {
        score = await this.scoreBuilder(item, { result, prompt, response });
        if (score) {
          // Same as Response object. But this time we need to also check if
          // the Score object is including some info about the Prompt
          // since they are allowed to not to include Prompt info at all.
          if (score.prompt && includedPromptCIDs[score.prompt.fullPromptCID]) {
            const cid = score.prompt.fullPromptCID;
            score.prompt = result.prompts.find((p) => p.fullPromptCID === cid)!;
          }

          // Only add this Score object if it is not in the result array yet.
          if (!includedScoreDIDs[score.scoreUUID]) {
            includedScoreDIDs[score.scoreUUID] = score.scoreUUID;
            result.scores.push(score);
          }
        }
      }
    }

    return result;
  }
}

export type GenericArrayParserPromptBuilder = (
  data: any,
  context: {
    result: ParseResult;
  }
) => MaybePromise<Prompt | undefined>;
export type GenericArrayParserResponseBuilder = (
  data: any,
  context: {
    result: ParseResult;

    /**
     * The generated Prompt object for the current item if there is one.
     */
    prompt?: Prompt;
  }
) => MaybePromise<PromptResponse | undefined>;
export type GenericArrayParserScoreBuilder = (
  data: any,
  context: {
    result: ParseResult;

    /**
     * The generated Prompt object for the current item if there is one.
     */
    prompt?: Prompt;

    /**
     * The generated Response object for the current item if there is one.
     */
    response?: PromptResponse;
  }
) => MaybePromise<PromptScore | undefined>;
