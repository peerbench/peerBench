import { AbstractCollector } from "./abstract/abstract-collector";

/**
 * Simple string collector that takes a string as input and outputs it as-is.
 * Useful for basic string processing or when you need to pass through string data.
 */
export class StringCollector extends AbstractCollector<string> {
  readonly identifier = "string";

  async collect(source: unknown) {
    // Check if the source is a string
    if (typeof source === "string") {
      return source;
    }

    // If source is not a string, return undefined
    return undefined;
  }
}
