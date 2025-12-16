import { TypeOf, z } from "zod";
import { AbstractGenerator } from "../abstract/abstract-generator";
import { EnumSchema } from "@/validation/enum";
import {
  paragraphMerge,
  ParagraphMergeStrategy,
} from "./helpers/paragraph-merge";
import { replaceEntities } from "./helpers/replace-entities";
import { parseResponseAsJSON } from "@/utils/llm";
import { cryptoRandom } from "./helpers/crypto-random";
import { OpenRouterProvider } from "@/providers";
import { PromptTypes } from "@/types";
import { AbstractLLMProvider } from "@/providers/abstract/abstract-llm-provider";

export class TRPGenerator extends AbstractGenerator {
  identifier = "trp";
  inputSchema = z.array(
    z.object({
      pmid: z.string(),
      title: z.string(),
      paragraphs: z.record(z.string(), z.string()),
      tags: z.array(z.string()),
    })
  );

  optionsSchema = z.object(
    {
      openRouterApiKey: z.string(),
      paragraphMergeStrategy: EnumSchema(ParagraphMergeStrategy).default(
        ParagraphMergeStrategy.TitlesWithinSentences
      ),
      model: z.string(),
      placeholder: z.string().default("{}"),
      nerPrompt: z
        .string()
        .optional()
        .default(
          `You are a Named Entity Recognition model which is specialized on medical relevant texts. Your task is extracting all medical related entities. Your output strictly forced to be a JSON array of strings where each item represents a single entity that you've extracted. Markdown formatting is forbidden. JSON output must be minified.`
        ),
    },
    { message: "No options provided" }
  );

  async generatePrompts(
    input: TypeOf<this["inputSchema"]>,
    options?: z.input<(typeof this)["optionsSchema"]>
  ) {
    const parsedOptions = this.optionsSchema.parse(options);
    const provider = new OpenRouterProvider({
      apiKey: parsedOptions.openRouterApiKey,
    });

    // Generate Prompts for each article
    const generatedPrompts = await Promise.all(
      input.map((article) =>
        this.generatePromptFromArticle(article, provider, parsedOptions)
      )
    );

    return generatedPrompts.filter((prompt) => prompt !== null);
  }

  private async generatePromptFromArticle(
    article: TypeOf<this["inputSchema"]>[number],
    provider: OpenRouterProvider,
    options: z.infer<(typeof this)["optionsSchema"]>
  ) {
    const tags: string[] = [
      `generator-${this.identifier}`,
      "perform-ner",
      `merge-paragraphs-${options.paragraphMergeStrategy}`,
      `ner-for-medical-related-entities`,
    ];

    const text = `${article.title}\n\n${paragraphMerge(
      article.paragraphs,
      options.paragraphMergeStrategy
    )}`;

    const entities = await this.doNER({
      text,
      provider,
      model: options.model,
      systemPrompt: options.nerPrompt,
    });

    if (!entities) {
      return null;
    }

    const modifiedText = replaceEntities(text, entities, options.placeholder);

    const fullPrompt = `TEXT:\n${modifiedText!}\n\nENTITIES:\n${entities!
      .sort(() => cryptoRandom() - 0.5)
      .map((e) => `"${e}"`)
      .join(", ")}`;

    return await this.buildPrompt({
      question: modifiedText,
      fullPrompt,
      correctAnswer: text, // Original formatted text is the correct answer
      type: PromptTypes.TextReplacement,
      metadata: {
        articleTags: article.tags,
        articleId: article.pmid,
        paragraphMergeStrategy: options.paragraphMergeStrategy,
        entityTypes: ["medical-related-entities"],
        entities,
        brainModel: options.model,
        generatorTags: tags,

        tags: [...tags, ...article.tags],
      },
    });
  }

  private async doNER(params: {
    text: string;
    provider: AbstractLLMProvider;
    model: string;
    systemPrompt: string;
  }) {
    const { text, provider, model, systemPrompt } = params;
    const { data } = await provider.forward(text, {
      model,
      system: systemPrompt,
    });

    return parseResponseAsJSON<string[]>(data);
  }
}
