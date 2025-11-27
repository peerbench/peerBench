# Implementing a Collector

This guide demonstrates how to implement a new Collector for the peerBench SDK.

## Overview

Collectors are responsible for taking a source input and creating a structured data that later can be used by the Generators to generate new Prompts.

### Required Properties

**`readonly identifier: string`**

- A unique string that identifies your Collector
- Should be descriptive and unique across all Collectors
- Useful when you try to find this Collector among the others

### Abstract Methods

**`async collect(source: unknown, options?: Record<string, any>): Promise<T | undefined>`**

- This is the main collection method you must implement
- Takes a `source` as the input
- Interpretation of what `source` parameter is depends on the implementation
- For example if it is a URL, you should validate that it is a real URL string and fetch data from it
- Or if it is a file path, you should be checking that file is exist
- Optional `options` parameter for configurable collection behavior
- Must return data matching your Collector's output type `T`, or `undefined` if the process fails
- The generic type `T` represents what your collector **outputs**

## Basic Example

Here's a simple collector implementation that demonstrates the basic structure:

```typescript
import { AbstractCollector } from "@/collectors/abstract/abstract-collector";

interface MyCollectedData {
  id: string;
  title: string;
  content: string;
  metadata: Record<string, any>;
}

export class SimpleAPICollector extends AbstractCollector<MyCollectedData[]> {
  readonly identifier = "simple-api-collector";

  async collect(
    source: unknown,
    options?: Record<string, any>
  ): Promise<MyCollectedData[] | undefined> {
    // Type guard for input validation
    if (typeof source !== "string") {
      throw new Error("Source must be a string URL");
    }

    // Fetch data from external source
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse and transform the response
    const rawData = await response.json();
    return this.transformData(rawData);
  }

  private transformData(rawData: any): MyCollectedData[] {
    return rawData.map((item: any) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      metadata: item.metadata || {},
    }));
  }
}
```

## How to Test

Once you've implemented your Collector, you can test it by using it inside the `packages/sdk/scripts/dev.ts` file. Here's a complete example:

```typescript
import { SimpleAPICollector } from "@/collectors/simple-api-collector";

async function main() {
  // Test your custom Collector
  const collector = new SimpleAPICollector();

  try {
    // Collect data from JSONPlaceholder API
    const data = await collector.collect(
      "https://jsonplaceholder.typicode.com/posts"
    );
    console.log("Collected data:", data);

    if (data && Array.isArray(data)) {
      console.log(`Successfully collected ${data.length} posts`);
      console.log("First post:", data[0]);
    }
  } catch (error) {
    console.error("Collection failed:", error);
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

See the `examples/collectors/` directory for complete working examples:

- `file-system-collector.ts` - Local file collection
- `news-api-collector.ts` - API-based collection

These examples demonstrate real-world implementations and can serve as templates for your own collectors.

## What's Next?

Now that you understand how to implement a Collector, you're ready to learn about the next component in the peerBench SDK: **Generators**.

**Next Documentation**: [Implementing a Generator](./implementing-a-generator.md)
