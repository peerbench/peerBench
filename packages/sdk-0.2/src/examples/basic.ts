import { peerbenchRunner } from "../benchmarks/peerbench/runner";
import { OpenRouterProvider } from "../providers";
import { config } from "@dotenvx/dotenvx";
import { LLMAsAJudgeScorer } from "../scorers";
import { MCQTestCaseSchemaV1 } from "../benchmarks/peerbench";
import { SimpleSystemPromptSchemaV1 } from "../schemas/llm";
import z from "zod";

// Load env variables
config();

// Prepare a test case using peerbench schemas
const multipleChoiceQuestion = MCQTestCaseSchemaV1.new({
  id: "1",
  correctAnswerKeys: ["A"],
  question: "What is the capital of France?",
  options: {
    A: "Paris",
    B: "London",
    C: "Berlin",
    D: "Madrid",
  },
});

async function main() {
  const provider = new OpenRouterProvider({
    apiKey: process.env.OPENROUTER_API_KEY!,
  });

  const llmJudgeScorer = new LLMAsAJudgeScorer({
    provider,
  });

  // System prompt for the target model
  const systemPrompt = SimpleSystemPromptSchemaV1.new({
    id: "1",
    content: "Only provide your answer, no other text or explanation.",
    version: 1,
  });

  const result = await peerbenchRunner({
    testCase: multipleChoiceQuestion,
    provider,
    scorer: llmJudgeScorer,
    runConfig: {
      systemPrompt,

      llmJudgeFieldsToExtract: {
        firstWord: z
          .string()
          .nullable()
          .describe(
            "The first complete word of the answer included within the answer in case. Null if only one character"
          ),
      },

      model: "meta-llama/llama-3.2-3b-instruct:free",
      llmJudgeModel: "mistralai/mistral-7b-instruct:free",
    },
  });

  console.log("Test Case");
  console.log(JSON.stringify(multipleChoiceQuestion, null, 2));
  console.log("Response");
  console.log(JSON.stringify(result.response, null, 2));
  console.log("Score");
  console.log(JSON.stringify(result.score, null, 2));
}

main();
