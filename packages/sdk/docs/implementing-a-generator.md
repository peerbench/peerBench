# Implementing a Generator

This guide demonstrates how to implement a new Generator for the peerBench SDK.

## Overview

Generators are responsible for taking the collected data from a Collector and generate one or more Prompts based on that data.

### Quick setup test 
```
npm i
cd packages/sdk/scripts
npx tsx scripts/pubmed_gen_debug_example.ts    
```

## Basic Example

### Required Properties

**`readonly identifier: string`**

- A unique string that identifies your Generator
- Should be descriptive and unique across all Generators
- Useful when you try to find this Generator among the others

**`inputSchema: z.ZodSchema`**

- A Zod schema that validates the input data of the `generatePrompts` method
- If you want to process data from different Collectors, simply you need to make this schema compatible with the output types of those Collectors
- Base class handles the validation of the input so you just need to define the schema

### Abstract Methods

**`protected async generatePrompts(input: z.infer<(typeof this)["inputSchema"]>, options?: Record<string, any>): Promise<Prompt[]>`**

- This is the main generation method you must implement
- Takes validated input data that matches your `inputSchema`
- Optional `options` parameter for configurable generation behavior
- Must return an array of `Prompt` objects
- The input is already validated by the base class

Here's a simple Generator implementation that demonstrates the basic structure:

```typescript
import { AbstractGenerator } from "@/generators/abstract/abstract-generator";
import { Prompt, PromptTypes } from "@/types";
import { z } from "zod";

export class SimpleQuestionGenerator extends AbstractGenerator {
  readonly identifier = "simple-question-generator";

  inputSchema = z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.record(z.any()),
  });

  protected async generatePrompts(
    input: z.infer<(typeof this)["inputSchema"]>,
    options?: Record<string, any>
  ): Promise<Prompt[]> {
    // Transform validated input into Prompts
    const question = `Answer the following question: ${input.content}`;
    const fullPrompt = question;

    // Use the buildPrompt helper method for Prompt creation
    const prompt = await this.buildPrompt({
      question,
      correctAnswer: "Your expected answer here",
      fullPrompt,
      type: PromptTypes.Text,
      metadata: input.metadata,
    });

    return [prompt];
  }
}
```

## Type Compatibility Between Collectors and Generators

The key to making Collectors and Generators work together is ensuring schema compatibility. When you define a Generator, the `inputSchema` specifies what input data structure the Generator expects.

**Example**: If you have a Collector that outputs data matching your Generator's `inputSchema`, they are compatible:

```typescript
// Collector outputs data matching the schema
export class FileCollector extends AbstractCollector<FileData[]> {
  // ... implementation
}

// Generator expects data matching inputSchema
export class QuestionGenerator extends AbstractGenerator {
  inputSchema = z.object({
    id: z.string(),
    content: z.string(),
    metadata: z.record(z.any()),
  });

  // ... implementation
}

// These can be used together if the Collector output matches the Generator's inputSchema
const collector = new FileCollector();
const generator = new QuestionGenerator();

const collectedData = await collector.collect("path/to/file");
const prompts = await generator.generate(collectedData); // Schema validation ensures compatibility
```

## How to Test

Once you've implemented your Generator, you can test it by using it inside the `packages/sdk/scripts/dev.ts` file. Here's a complete example:

```typescript
import { SimpleQuestionGenerator } from "@/generators/simple-question-generator";

async function main() {
  // Test your custom Generator
  const generator = new SimpleQuestionGenerator();

  // Test with mock data
  const mockInput = [
    {
      id: "1",
      content: "Sample content for testing",
      metadata: { source: "test", category: "example" },
    },
    {
      id: "2",
      content: "Another sample content",
      metadata: { source: "test", category: "example" },
    },
  ];

  try {
    const prompts = await generator.generate(mockInput);
    console.log("Generated prompts:", prompts);
    console.log(`Successfully generated ${prompts.length} prompts`);
  } catch (error) {
    console.error("Generation failed:", error);
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

See the `examples/generators/` directory for complete working examples:

- `multiple-choice-generator.ts` - Multiple choice question generation
- `sentence-ordering-generator.ts` - Sentence ordering task generation

These examples demonstrate real-world implementations and can serve as templates for your own Generators.

## What's Next?

Now that you understand how to implement a Generator, you're ready to learn about the next component in the peerBench SDK: **Scorers**.

**Next Documentation**: [Implementing a Scorer](./implementing-a-scorer.md)
