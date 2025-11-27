import { z } from "zod";
import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { parseResponseAsJSON } from "@/utils/llm";
import { BaseLLMProvider, OpenRouterProvider } from "@/providers";
import { PromptTypes } from "@/types";
import { debugLog } from "@/utils/debug";
import { formatString, preparePrompt } from "@/utils";
import {
  ExactMatchScorer,
  MultipleChoiceScorer,
  RefAnswerEqualityLLMJudgeScorer,
} from "@/scorers";

/**
 * Generic Multiple Choice Question Generator using an LLM model
 */
export class MCQGenerator extends AbstractGenerator {
  readonly identifier = "mcq";

  inputSchema = z.array(z.any());

  optionsSchema = z
    .object(
      {
        /**
         * The API key for the OpenRouter provider. Won't be used if `provider` is given.
         */
        openRouterApiKey: z.string().optional(),

        /**
         * The Provider that is going to be used to generate the Prompts.
         */
        provider: z.instanceof(BaseLLMProvider).optional(),

        /**
         * The model that is going to be used to generate the prompts
         */
        model: z.string(),

        systemPromptPrefix: z.string().optional().default(""),

        /**
         * Additional rules that will be appended to the system prompt.
         */
        systemPromptRules: z.array(z.string()).default([]),
        systemPrompt: z.string().optional()
          .default(`Take the input text and find a difficult question about the content. The question should test understanding of the key concepts, facts or relationships described in the text. The question should include enough context to answer it without the need to read the text. The question must not refer to the text in any way. The question must not want a very specific values such as p-values or time frames like when effect was on day. Each option must not be longer than 5-7 words.

You need to generate a multiple choice question with at least 8 options. Some of the options can be real terms from the domain, others can be plausible-sounding terms that you invent to sound authentic to the subject matter.
{rules}
Your output strictly forced to be a JSON object which applies the following schema:
\`\`\`json
{
  "question": "Question text",
  "options": {
    "A": "Option A text",
    "B": "Option B text",
    "C": "Option C text",
    "D": "Option D text"
    // ....
  },
  "answerKey": "C",
  "answer": "Option C text"
}
\`\`\`
`),
        systemPromptSuffix: z.string().optional().default(""),

        /**
         * The main function that parses the input value to a string.
         */
        parseInput: z.function().args(z.any()).returns(z.string()),

        /**
         * Whether to include the original data as a field inside the metadata.
         */
        includeOriginalInputAsMetadata: z.boolean().optional().default(false),

        /**
         * Additional metadata that is going to be added to the each Prompt.
         * If a function is given then that function takes an argument which
         * is the input value for each item and generates the additional metadata.
         */
        additionalMetadata: z
          .union([
            z
              .function()
              .args(z.any(), z.object({ systemPrompt: z.string() }))
              .returns(z.record(z.string(), z.any())),
            z.record(z.string(), z.any()),
          ])
          .optional(),
      },
      { message: "No options provided" }
    )
    .transform((options, ctx) => {
      if (options.provider !== undefined) {
        return options;
      }

      if (options.openRouterApiKey !== undefined) {
        return {
          ...options,
          provider: new OpenRouterProvider({
            apiKey: options.openRouterApiKey,
          }),
        };
      }

      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No provider or openRouterApiKey provided",
      });

      return z.NEVER;
    });

  async generatePrompts(
    input: z.input<this["inputSchema"]>,
    options?: z.input<this["optionsSchema"]>
  ) {
    // Parse the options
    const parsedOptions = this.optionsSchema.parse(options);

    // Build the system prompt
    const systemPrompt = formatString(
      parsedOptions.systemPromptPrefix +
        parsedOptions.systemPrompt +
        parsedOptions.systemPromptSuffix,
      {
        rules:
          parsedOptions.systemPromptRules.length > 0
            ? `\nAlso strictly follow the rules below:\n${parsedOptions.systemPromptRules.join("\n")}\n`
            : "",
      }
    );

    // Generate Prompts for each text input
    const results = await Promise.all(
      input.map((item) =>
        this.generateFromInput(
          item,
          parsedOptions.provider!,
          parsedOptions,
          systemPrompt
        )
      )
    );

    // Filter out null results
    return results.filter((result) => result !== null);
  }

  private async generateFromInput(
    input: any,
    provider: BaseLLMProvider,
    options: z.infer<this["optionsSchema"]>,
    systemPrompt: string
  ) {
    const inputText = options.parseInput(input);

    // Forward request to the LLM
    const response = await provider.forward(inputText, {
      model: options.model,
      system: systemPrompt,
    });

    const mcq = parseResponseAsJSON<{
      question: string;
      options: Record<string, string>;
      answerKey: string;
      answer: string;
    }>(response.data);

    if (!mcq) {
      debugLog("Couldn't parsed the LLM response as a JSON:", response.data);
      return null;
    }

    // Append the options to the full prompt
    const fullPrompt = preparePrompt(mcq.question, mcq.options);

    // Get the additional metadata
    const additionalMetadata =
      typeof options.additionalMetadata === "function"
        ? options.additionalMetadata(input, { systemPrompt })
        : options.additionalMetadata || {};

    return await this.buildPrompt({
      correctAnswer: mcq.answerKey || mcq.answer,
      question: mcq.question,
      options: mcq.options || {},
      fullPrompt: fullPrompt,
      type: PromptTypes.MultipleChoice,
      metadata: {
        tags: [
          `generator-${this.identifier}`,

          // Expand the tags field if it is provided within the additional metadata
          ...(Array.isArray(additionalMetadata.tags)
            ? additionalMetadata.tags
            : []),
        ],
        model: options.model,

        generatorIdentifier: this.identifier,
        generatorClassName: this.constructor.name,

        // Input might be an object but input text will be a string
        originalSourceInput: options.includeOriginalInputAsMetadata
          ? input
          : undefined,
        originalSourceInputText: inputText,

        ...additionalMetadata,
      },

      scorers: [
        // TODO: We should be able to access identifier without instantiating an object
        new MultipleChoiceScorer().identifier,
        new RefAnswerEqualityLLMJudgeScorer().identifier,
        new ExactMatchScorer().identifier,
      ],
    });
  }
}
