# Implementing a Scorer

This guide demonstrates how to implement a new Scorer for the peerBench SDK.

## Overview

Scorers are responsible for taking a Response that is made for a Prompt and giving a score between 0 and 1. The given score represents how well the model performed on that particular Prompt.

## Basic Example

### Required Properties

**`readonly identifier: string`**

- A unique string that identifies your Scorer
- Should be descriptive and unique across all Scorers
- Useful when you try to find this Scorer among the others

### Abstract Methods

**`scoreOne(response: PromptResponse, options?: Record<string, any>): MaybePromise<PromptScore | undefined>`**

- This is the main scoring method you must implement
- Takes a `PromptResponse` object containing both the Prompt and Response
- Optional `options` parameter for configurable scoring behavior
- Must return a `PromptScore` object or `undefined` if scoring fails
- The `PromptScore` object includes the original response data plus a `score` field (number between 0 and 1)
- The score represents: 1.0 = perfect, 0.0 = completely wrong
- The `PromptScore` structure extends `PromptResponse` with additional fields:
  - `score?: number` - The calculated score (0-1)
  - `metadata?: Record<string, any>` - Additional metadata about the scoring

**`canScore(response: PromptResponse): MaybePromise<boolean>`**

- This method determines if your Scorer can handle a specific Response
- Returns `true` if your Scorer implementation is eligible to score the Response and `false` if it isn't.
- `MaybePromise<T>` means the method can return either `T` or `Promise<T>` (synchronous or asynchronous)

Here's a very simple scorer implementation that demonstrates the basic structure:

```typescript
import { AbstractScorer } from "@/scorers/abstract/abstract-scorer";
import { PromptResponse, PromptScore } from "@/types";

export class SimpleExactMatchScorer extends AbstractScorer {
  readonly identifier = "simple-exact-match";

  async scoreOne(
    response: PromptResponse,
    options?: Record<string, any>
  ): Promise<PromptScore | undefined> {
    if (!(await this.canScore(response))) {
      return undefined;
    }

    // Extract the correct answer from the prompt
    const correctAnswer = response.prompt.answer;

    // Get the model's response
    const modelResponse = response.data;

    // Simple exact match scoring (case-insensitive)
    const isCorrect =
      correctAnswer?.toLowerCase().trim() ===
      modelResponse?.toLowerCase().trim();

    // Calculate score: 1.0 for correct answers, 0.0 for incorrect
    const score = isCorrect ? 1.0 : 0.0;

    // Return PromptScore object with the original response data plus score and metadata
    return {
      ...response,
      score,
      metadata: {
        scorerIdentifier: this.identifier,
        isExactMatch: isCorrect,
      },
    } as PromptScore;
  }

  async canScore(response: PromptResponse): Promise<boolean> {
    // This scorer can handle any response that has data and a prompt with an answer
    return (
      response.data !== undefined &&
      response.prompt !== undefined &&
      response.prompt.answer !== undefined
    );
  }
}
```

## How to Test

Once you've implemented your Scorer, you can test it by using it inside the `packages/sdk/scripts/dev.ts` file. Here's a complete example:

```typescript
import { SimpleExactMatchScorer } from "@/scorers/simple-exact-match-scorer";
import { PromptResponse, PromptTypes } from "@/types";

async function main() {
  // Test your custom Scorer
  const scorer = new SimpleExactMatchScorer();

  // Create mock responses for testing
  const mockResponse: PromptResponse = {
    prompt: {
      promptUUID: "mock-id",
      prompt: "What is the capital of France?",
      promptCID: "mock-cid",
      promptSHA256: "mock-sha",
      fullPrompt: "What is the capital of France?",
      fullPromptCID: "mock-cid",
      fullPromptSHA256: "mock-sha",
      answer: "Paris",
      answerKey: "A",
      options: {
        A: "Paris",
        B: "London",
        C: "Berlin",
        D: "Madrid",
      },
      type: PromptTypes.MultipleChoice,
      metadata: {},
      scorers: ["simple-exact-match"],
    },
    data: "Paris", // Correct answer
    provider: "mock",
    modelId: "mock-model",
    modelName: "Mock Model",
    modelOwner: "mock",
    modelHost: "mock",
    taskId: "mock-task",
    startedAt: Date.now() - 5000,
    runId: "mock-run",
    sourceTaskFile: {
      cid: "mock-cid",
      sha256: "mock-sha",
      fileName: "mock-file.json",
    },
    finishedAt: Date.now(),
  };

  const wrongResponse = {
    ...mockResponse,
    data: "London", // Wrong answer
  };

  // Test if the Scorer can handle these responses
  const canScoreCorrect = await scorer.canScore(mockResponse);
  const canScoreWrong = await scorer.canScore(wrongResponse);

  console.log("Can score correct response:", canScoreCorrect);
  console.log("Can score wrong response:", canScoreWrong);

  if (canScoreCorrect) {
    const correctScoreResult = await scorer.scoreOne(mockResponse);
    console.log("Correct answer score result:", correctScoreResult);
    console.log("Score:", correctScoreResult?.score);
    console.log("Metadata:", correctScoreResult?.metadata);
  }

  if (canScoreWrong) {
    const wrongScoreResult = await scorer.scoreOne(wrongResponse);
    console.log("Wrong answer score result:", wrongScoreResult);
    console.log("Score:", wrongScoreResult?.score);
    console.log("Metadata:", wrongScoreResult?.metadata);
  }
}

main().catch(console.error);
```

### Run it

Navigate to the `packages/sdk` directory and run:

```bash
npm run dev
```

This will execute `dev.ts`.

## Examples

See the `src/scorers/` directory for complete working examples:

- `exact-match-scorer.ts` - Exact match scoring that returns PromptScore objects
- `multiple-choice-scorer.ts` - Multiple choice scoring with answer extraction
- `ref-answer-equality-llm-judge-scorer.ts` - LLM-based scoring for reference answer equality

These examples demonstrate real-world implementations and show how to properly return `PromptScore` objects with scores and metadata. They can serve as templates for your own Scorers.
