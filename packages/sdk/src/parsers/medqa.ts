import { AbstractParser, ParseResult } from "./abstract-parser";
import { Prompt, PromptTypes } from "@/types";
import { parquetReadObjects } from "hyparquet";
import { z } from "zod";
import { readFile } from "@/utils/file";
import { bufferToString } from "@/utils/string";
import { parseJSONL, tryParseJson } from "@/utils/json";
import { InvalidDataError, ParserIsNotCompatibleError } from "@/errors/parser";
import { preparePrompt } from "@/utils/prompt";
import { buildPrompt } from "@/utils/builder";

const MedQAPromptObjectSchema = z.object({
  question: z.string(),
  options: z.record(z.string(), z.string()),
  answer: z.string(),
  answer_idx: z.string(),
  meta_info: z.string().optional(),
});

export class MedQAParser extends AbstractParser {
  static readonly identifier = "medqa";

  async parseFile(path: string) {
    const content = await readFile(path);
    return this.parseContent(content);
  }

  async parseContent(content: string | Uint8Array): Promise<ParseResult> {
    let data: unknown[] | undefined;

    // Try to parse as Parquet first if it's an ArrayBuffer
    if (content instanceof ArrayBuffer) {
      try {
        data = await parquetReadObjects({ file: content });
      } catch {
        // Not a valid Parquet file, continue with other formats
      }
    }

    // If not Parquet or parsing failed, try other formats
    if (!data) {
      // Convert ArrayBuffer to string if needed
      const contentString =
        typeof content === "string" ? content : bufferToString(content);

      // Try to parse it as JSON or JSONL
      data = tryParseJson(contentString);
      if (!data) {
        data = parseJSONL(contentString);
      }
    }

    if (!data || data.length == 0) {
      throw new InvalidDataError();
    }

    const prompts: Prompt[] = [];
    const validation = z.array(MedQAPromptObjectSchema).safeParse(data);

    if (!validation.success) {
      throw new ParserIsNotCompatibleError();
    }
    const validatedData = validation.data;

    let rowNumber = 0;
    // Parse prompts
    for (const rawPrompt of validatedData) {
      const fullPrompt = preparePrompt(rawPrompt.question, rawPrompt.options);
      prompts.push(
        await buildPrompt({
          options: rawPrompt.options,
          prompt: rawPrompt.question,
          type: PromptTypes.MultipleChoice,
          answer: rawPrompt.answer,
          answerKey: rawPrompt.answer_idx,
          fullPrompt,
          metadata: {
            medqaCategory: rawPrompt.meta_info,
            rowNumberInSource: rowNumber,
          },
        })
      );
      rowNumber++;
    }

    return {
      prompts,
      responses: [],
      scores: [],
    };
  }
}
