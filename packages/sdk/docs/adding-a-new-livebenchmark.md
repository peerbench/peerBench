# Adding a New Live Benchmark

This guide demonstrates how to implement a complete live benchmark system for the peerBench SDK by creating three interconnected components: a **Collector**, a **Generator**, and a **Scorer**.

## Overview

A live benchmark in peerBench consists of three main components that work together:

1. **Collector** - Gathers raw data from various sources (APIs, files, databases, etc.)
2. **Generator** - Transforms collected data into structured Prompts with questions and answers
3. **Scorer** - Evaluates AI model Responses and assigns scores between 0 and 1

## Architecture Overview

```
Raw Data Source → Collector → Structured Data → Generator → Prompts → AI Models → Responses → Scorer → Scores
```

## Step 1: Implement a Collector

Create your Collector class under `packages/sdk/src/collectors/jsonplaceholder-collector.ts` then implement it:

```typescript
import { AbstractCollector } from "@/collectors/abstract/abstract-collector";

interface JSONPlaceHolderCollectedData {
  userId: number;
  id: number;
  title: string;
  body: string;
}

export class JSONPlaceHolderDataCollector extends AbstractCollector<
  JSONPlaceHolderCollectedData[]
> {
  readonly identifier = "json-placeholder-data-collector";

  async collect(source: unknown) {
    // Validate the source
    if (typeof source !== "string") {
      throw new Error("Source must be a string");
    }
    if (!source.startsWith("http://") && !source.startsWith("https://")) {
      throw new Error("Source must be a valid URL");
    }

    // Fetch and transform data
    const response = await fetch(source);
    if (!response.ok) {
      const text = await response
        .text()
        .catch(() => "[Response not available]");
      throw new Error(
        `Request failed with ${response.status} ${response.statusText}: ${text}`
      );
    }

    return await response.json();
  }
}
```

## Step 2: Test the Collector

Now you can go to `packages/sdk/scripts/dev.ts`, import your Collector and try to use it:

```typescript
import { JSONPlaceHolderDataCollector } from "@/collectors/jsonplaceholder-collector";

async function main() {
  // Collect the data
  const collector = new JSONPlaceHolderDataCollector();
  const data = await collector.collect(
    "https://jsonplaceholder.typicode.com/posts"
  );

  console.log("Collected data:", data);
}

main().catch(console.error);
```

Then open up a terminal in the `packages/sdk` directory and type;

```sh
npm run dev
```

This command will run the `dev.ts` script that you've just written. You should get an array of objects as the output.

## Step 3: Implement a Generator

Now we can implement a Generator which accepts our Collector's output and generate Prompts from it. Do the same thing like you did for creating the Collector; create a new file under `packages/sdk/src/generators/jsonplaceholder-generator.ts` and implement it

```typescript
import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { MultipleChoiceScorer } from "@/scorers";
import { Prompt, PromptTypes } from "@/types";
import { z } from "zod";

export class JSONPlaceHolderGenerator extends AbstractGenerator {
  readonly identifier = "json-prompt-generator";

  inputSchema = z.array(
    z.object({
      userId: z.number(),
      id: z.number(),
      title: z.string(),
      body: z.string(),
    })
  );

  protected async generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>
  ): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    for (const item of input) {
      const words = item.body.split(" ");
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const question = item.body.replaceAll(randomWord, "______");
      const fullPrompt = question;

      // Generate unique options ensuring the correct answer is included
      const correctAnswer = randomWord;
      const otherWords = words.filter((word) => word !== correctAnswer);

      // Shuffle and take 3 unique wrong answers
      const shuffledWords = otherWords.sort(() => Math.random() - 0.5);
      const wrongAnswers = shuffledWords.slice(0, 3);

      // Ensure we have enough wrong answers
      if (wrongAnswers.length < 3) continue;

      // Create options with correct answer and shuffle them
      const allOptions = [correctAnswer, ...wrongAnswers];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

      // Create options object once
      const options = {
        A: shuffledOptions[0],
        B: shuffledOptions[1],
        C: shuffledOptions[2],
        D: shuffledOptions[3],
      };

      // Find which option letter contains the correct answer
      const correctAnswerLetter = Object.keys(options).find(
        (key) => options[key as keyof typeof options] === correctAnswer
      ) as "A" | "B" | "C" | "D";

      const prompt = await this.buildPrompt({
        question,

        // For multiple choice prompts,
        // the correct answer is the letter of the correct answer
        // otherwise it is the expected response
        correctAnswer: correctAnswerLetter,
        fullPrompt,
        options,
        type: PromptTypes.MultipleChoice,
        metadata: {
          generator: this.identifier,
        },

        // We expect that multiple choice Scorer can be used
        // to score the responses for this prompt
        scorers: [new MultipleChoiceScorer().identifier],
      });

      prompts.push(prompt);
    }

    return prompts;
  }
}
```

Then try to use this Generator in the `dev.ts`:

```typescript
import { JSONPlaceHolderDataCollector } from "@/collectors/jsonplaceholder-collector";
import { JSONPlaceHolderGenerator } from "@/generators/jsonplaceholder-generator";

async function main() {
  // Collect the data
  const collector = new JSONPlaceHolderDataCollector();
  const data = await collector.collect(
    "https://jsonplaceholder.typicode.com/posts"
  );

  console.log("Collected data:", data);

  // Generate the prompts
  const generator = new JSONPlaceHolderGenerator();
  const prompts = await generator.generate(data);

  console.log("Generated prompts:", prompts);
}

main().catch(console.error);
```

Run it via `npm run dev` then you should be seeing generated Prompts next to the collected data.

## Step 4: Implement a Scorer

Our Generator expects, the Responses of the Prompts that are generated by it will be scored by `MultipleChoiceScorer`. But if you have some additional algorithms, metrics etc. for scoring a Response, you can of course implement your own way to do it. But before that, we need to modify the Generator.

Currently our Generator only generates multiple choice typed Prompts. So we modify it to generate different types of Prompts and we can implement another Scorer for them:

```typescript
import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { MultipleChoiceScorer } from "@/scorers";
import { JSONPlaceHolderScorer } from "@/scorers/jsonplaceholder-scorer";

import { Prompt, PromptTypes } from "@/types";
import { z } from "zod";

export class JSONPlaceHolderGenerator extends AbstractGenerator {
  readonly identifier = "json-prompt-generator";

  inputSchema = z.array(
    z.object({
      userId: z.number(),
      id: z.number(),
      title: z.string(),
      body: z.string(),
    })
  );

  protected async generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>
  ): Promise<Prompt[]> {
    const prompts: Prompt[] = [];
    for (const item of input) {
      const words = item.body.split(" ");
      const randomWord = words[Math.floor(Math.random() * words.length)];
      const question = item.body.replaceAll(randomWord, "______");
      const fullPrompt = question;

      // Generate unique options ensuring the correct answer is included
      const correctAnswer = randomWord;
      const otherWords = words.filter((word) => word !== correctAnswer);

      // Shuffle and take 3 unique wrong answers
      const shuffledWords = otherWords.sort(() => Math.random() - 0.5);
      const wrongAnswers = shuffledWords.slice(0, 3);

      // Ensure we have enough wrong answers
      if (wrongAnswers.length < 3) continue;

      // Create options with correct answer and shuffle them
      const allOptions = [correctAnswer, ...wrongAnswers];
      const shuffledOptions = allOptions.sort(() => Math.random() - 0.5);

      // Create options object once
      const options = {
        A: shuffledOptions[0],
        B: shuffledOptions[1],
        C: shuffledOptions[2],
        D: shuffledOptions[3],
      };

      // Find which option letter contains the correct answer
      const correctAnswerLetter = Object.keys(options).find(
        (key) => options[key as keyof typeof options] === correctAnswer
      ) as "A" | "B" | "C" | "D";

      // Generate multiple choice prompt
      const multipleChoicePrompt = await this.buildPrompt({
        question,

        // For multiple choice prompts,
        // the correct answer is the letter of the correct answer
        // otherwise it is the expected response
        correctAnswer: correctAnswerLetter,
        fullPrompt,
        options,
        type: PromptTypes.MultipleChoice,
        metadata: {
          generator: this.identifier,
        },

        // We expect that multiple choice Scorer can be used
        // to score the responses for this prompt
        scorers: [new MultipleChoiceScorer().identifier],
      });

      prompts.push(multipleChoicePrompt);

      // Generate text replacement prompt
      const textReplacementPrompt = await this.buildPrompt({
        question,
        correctAnswer: item.body, // The original text itself is the expected answer
        fullPrompt,
        type: PromptTypes.TextReplacement,
        metadata: {
          generator: this.identifier,
        },
        scorers: [new JSONPlaceHolderScorer().identifier],
      });

      prompts.push(textReplacementPrompt);
    }

    return prompts;
  }
}
```

Probably you've noticed that we are using another Scorer in the new Prompt type. So for the new types of Prompts that we generate, we expect that the Responses will be Scored by that Scorer. Let's implement that Scorer. Create a file under `packages/sdk/src/scorers/jsonplaceholder-scorer.ts`:

```typescript
import { AbstractScorer } from "./abstract/abstract-scorer";
import { PromptResponse, PromptTypes } from "@/types";

export class JSONPlaceHolderScorer extends AbstractScorer {
  readonly identifier = "json-placeholder-scorer";

  async scoreOne(response: PromptResponse) {
    // Ensure that the given Response can be scored
    if (!(await this.canScore(response))) {
      return undefined;
    }

    const { data, prompt } = response;

    // Ensure that the data that we need is presented
    if (!data || !prompt) {
      return undefined;
    }

    // For text replacement, we compare the response with the correct answer
    const correctAnswer = prompt.answer;
    const userResponse = data.trim();

    // Exact match gets full credit
    if (userResponse.toLowerCase() === correctAnswer.toLowerCase()) {
      return 1.0;
    }

    // Check for partial matches
    if (
      userResponse.toLowerCase().includes(correctAnswer.toLowerCase()) ||
      correctAnswer.toLowerCase().includes(userResponse.toLowerCase())
    ) {
      return 0.8; // Partial credit for containing the answer
    }

    // Check for similar words (basic fuzzy matching)
    const similarity = this.calculateSimilarity(userResponse, correctAnswer);
    if (similarity > 0.7) {
      return 0.6; // Credit for similar answers
    }

    // Check for reasoning quality
    if (userResponse.length > 20) {
      return 0.1; // Small credit for detailed responses
    }

    return 0;
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    return (
      response.data !== undefined &&
      response.prompt !== undefined &&
      response.prompt.type === PromptTypes.TextReplacement &&
      response.prompt.answer !== undefined &&
      response.prompt.answer !== ""
    );
  }

  /**
   * Calculate basic similarity between two strings
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;
    if (s1.length === 0 || s2.length === 0) return 0.0;

    // Simple Levenshtein distance-based similarity
    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}
```

## Step 5: Testing everything together

Great! Now we have a Collector, Generator and a Scorer. Now we need to test the whole workflow. In a real environment, you also need to use Providers to forward generated Prompts and collect Responses.

For the sake of simplicity, we are going to mock the Responses. Now let's go back to `dev.ts` and modify it like below:

```typescript
import { JSONPlaceHolderDataCollector } from "@/collectors/jsonplaceholder-collector";
import { JSONPlaceHolderGenerator } from "@/generators/jsonplaceholder-generator";
import { PromptTypes } from "@/types";

async function main() {
  // Collect the data
  const collector = new JSONPlaceHolderDataCollector();
  const data = await collector.collect(
    "https://jsonplaceholder.typicode.com/posts"
  );

  console.log("Collected data:", data);

  // Generate the prompts
  const generator = new JSONPlaceHolderGenerator();
  const prompts = await generator.generate(data);

  const textReplacementPrompts = prompts.filter(
    (prompt) => prompt.type === PromptTypes.TextReplacement
  );
  const multipleChoicePrompts = prompts.filter(
    (prompt) => prompt.type === PromptTypes.MultipleChoice
  );

  console.log("Text replacement prompts:", textReplacementPrompts);
  console.log("Multiple choice prompts:", multipleChoicePrompts);
}

main().catch(console.error);
```

Now we can separated the Prompts based on their types. Run the code via `npm run dev` then save two generated Prompts from both types somewhere then modify the `dev.ts` again:

```typescript
import { JSONPlaceHolderDataCollector } from "@/collectors/jsonplaceholder-collector";
import { JSONPlaceHolderGenerator } from "@/generators/jsonplaceholder-generator";
import { MultipleChoiceScorer } from "@/scorers";
import { JSONPlaceHolderScorer } from "@/scorers/jsonplaceholder-scorer";
import { PromptResponse, PromptTypes } from "@/types";

async function main() {
  // Collect the data
  const collector = new JSONPlaceHolderDataCollector();
  const data = await collector.collect(
    "https://jsonplaceholder.typicode.com/posts"
  );

  // Generate the prompts
  const generator = new JSONPlaceHolderGenerator();
  const prompts = await generator.generate(data);

  // Filter the prompts based on their types
  const textReplacementPrompts = prompts.filter(
    (prompt) => prompt.type === PromptTypes.TextReplacement
  );
  const multipleChoicePrompts = prompts.filter(
    (prompt) => prompt.type === PromptTypes.MultipleChoice
  );

  // Get the first prompt from each type
  const textReplacePrompt = textReplacementPrompts[0];
  const multipleChoicePrompt = multipleChoicePrompts[0];

  // Mock the responses
  const mockedTextReplaceResponseCorrect: PromptResponse = {
    prompt: textReplacePrompt,
    data: textReplacePrompt.answer, // This is a correct/expected response
    provider: "mock",
    modelId: "mock",
    modelName: "mock",
    modelOwner: "mock",
    modelHost: "mock",
    taskId: "mock",
    startedAt: Date.now() - 10_000,
    runId: "mock",
    sourceTaskFile: {
      cid: "mock",
      sha256: "mock",
      fileName: "mock",
    },
    finishedAt: Date.now(),
  };
  const mockedTextReplaceResponseWrong: PromptResponse = {
    prompt: textReplacePrompt,
    data: textReplacePrompt.answer + "wrong", // This is a wrong response
    provider: "mock",
    modelId: "mock",
    modelName: "mock",
    modelOwner: "mock",
    modelHost: "mock",
    taskId: "mock",
    startedAt: Date.now() - 10_000,
    runId: "mock",
    sourceTaskFile: {
      cid: "mock",
      sha256: "mock",
      fileName: "mock",
    },
    finishedAt: Date.now(),
  };

  const mockedMultipleChoiceResponseCorrect: PromptResponse = {
    prompt: multipleChoicePrompt,
    data: multipleChoicePrompt.answerKey, // The correct answer key
    provider: "mock",
    modelId: "mock",
    modelName: "mock",
    modelOwner: "mock",
    modelHost: "mock",
    taskId: "mock",
    startedAt: Date.now() - 10_000,
    runId: "mock",
    sourceTaskFile: {
      cid: "mock",
      sha256: "mock",
      fileName: "mock",
    },
    finishedAt: Date.now(),
  };
  const mockedMultipleChoiceResponseWrong: PromptResponse = {
    prompt: multipleChoicePrompt,
    // Find a wrong answer key
    data: Object.keys(multipleChoicePrompt.options).find(
      (key) => key !== multipleChoicePrompt.answerKey
    )!,
    provider: "mock",
    modelId: "mock",
    modelName: "mock",
    modelOwner: "mock",
    modelHost: "mock",
    taskId: "mock",
    startedAt: Date.now() - 10_000,
    runId: "mock",
    sourceTaskFile: {
      cid: "mock",
      sha256: "mock",
      fileName: "mock",
    },
    finishedAt: Date.now(),
  };

  // Log the mocked responses (they also include the Prompt)
  console.log(
    "Mocked text replace response:",
    mockedTextReplaceResponseCorrect
  );
  console.log(
    "Mocked multiple choice response correct:",
    mockedMultipleChoiceResponseCorrect
  );
  console.log(
    "Mocked multiple choice response wrong:",
    mockedMultipleChoiceResponseWrong
  );

  // Instantiate the Scorers
  const textReplaceScorer = new JSONPlaceHolderScorer();
  const multipleChoiceScorer = new MultipleChoiceScorer();

  // Score the responses
  const textReplaceScoreCorrect = await textReplaceScorer.scoreOne(
    mockedTextReplaceResponseCorrect
  );
  const textReplaceScoreWrong = await textReplaceScorer.scoreOne(
    mockedTextReplaceResponseWrong
  );
  const multipleChoiceScore = await multipleChoiceScorer.scoreOne(
    mockedMultipleChoiceResponseCorrect
  );
  const multipleChoiceScoreWrong = await multipleChoiceScorer.scoreOne(
    mockedMultipleChoiceResponseWrong
  );

  console.log("Text replace score correct:", textReplaceScoreCorrect);
  console.log("Text replace score wrong:", textReplaceScoreWrong);
  console.log("Multiple choice score correct:", multipleChoiceScore);
  console.log("Multiple choice score wrong:", multipleChoiceScoreWrong);
}

main().catch(console.error);
```

> We also have some predefined mocked Prompts and Responses inside `packages/sdk/scripts/mock` directory. You can use them if they are fit with your Scorer implementation. If they are not, it will be better to use your own mocked Responses.

You can implement more tests to ensure your Scorer is working as expected. Here we have implemented a random mocked way to test them.

## Step 5: Contributing to peerBench SDK

Once your components are working correctly, follow these steps to contribute them to the peerBench SDK:

### Update Index Files

Export your components in the respective `index.ts` files:

```typescript
// packages/sdk/src/collectors/index.ts
export { JSONPlaceHolderDataCollector } from "./jsonplaceholder-collector";

// packages/sdk/src/generators/index.ts
export { JSONPlaceHolderGenerator } from "./jsonplaceholder-generator";

// packages/sdk/src/scorers/index.ts
export { JSONPlaceHolderScorer } from "./jsonplaceholder-scorer";
```

### Clear the `dev.ts` file

That file is only for testing purposes so you shouldn't be committing the changes that you've done in this file.

### Open a Pull Request

Commit your changes and open a Pull Request in the peerBench repository. Yeah, that's all!

## Related Documentation

You can check the individual docs to have more in depth knowledge about each component:

- [Implementing a Collector](./implementing-a-collector.md)
- [Implementing a Generator](./implementing-a-generator.md)
- [Implementing a Scorer](./implementing-a-scorer.md)
