import { AbstractParser, ParseResult } from "@/parsers/abstract-parser";
import { Prompt, PromptTypes } from "@/types";
import { parquetReadObjects } from "hyparquet";
import { z } from "zod";
import { readFile } from "@/utils/file";
import { bufferToString } from "@/utils/string";
import { parseJSONL, tryParseJson } from "@/utils/json";
import { InvalidDataError, ParserIsNotCompatibleError } from "@/errors/parser";
import { preparePrompt } from "@/utils/prompt";
import { buildPrompt } from "@/utils/builder";

const MMLUProTaskZodSchema = z.object({
  question_id: z.coerce.number(),
  question: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  answer_index: z.coerce.number(),
  cot_content: z.string(),
  category: z.string(),
  src: z.string(),
});

export class MMLUProParser extends AbstractParser {
  static readonly identifier = "mmlu-pro";

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
    const validation = z.array(MMLUProTaskZodSchema).safeParse(data);

    if (!validation.success) {
      throw new ParserIsNotCompatibleError();
    }

    const validatedData = validation.data;

    let rowNumber = 0;
    // Parse prompts
    for (const rawPrompt of validatedData) {
      // Convert options array to record
      const options: Record<string, string> = {};
      let answerKey = "";

      for (let i = 0; i < rawPrompt.options.length; i++) {
        const option = rawPrompt.options[i];
        const letter = String.fromCharCode(65 + i);
        options[letter] = option;

        // Get the answer letter
        if (i === rawPrompt.answer_index) {
          answerKey = letter;
        }
      }

      const fullPrompt = preparePrompt(rawPrompt.question, options);
      prompts.push(
        await buildPrompt({
          options,
          prompt: rawPrompt.question,
          answerKey,
          answer: rawPrompt.options[rawPrompt.answer_index],
          fullPrompt,
          type: PromptTypes.MultipleChoice,
          metadata: {
            mmluProCategory: rawPrompt.category,
            rowNumberInSource: rowNumber,
            mmluProQuestionId: rawPrompt.question_id,
            mmluProCotContent: rawPrompt.cot_content,
            mmluProSource: rawPrompt.src,
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
