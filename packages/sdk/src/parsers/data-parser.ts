import { AbstractParser } from "./abstract-parser";
import { MedQAParser } from "./medqa";
import { MMLUProParser } from "./mmlu-pro";
import { PBParser } from "./pb";

/**
 * Parser class for automatically detect and parse the data
 * with the appropriate parser.
 */
export class DataParser {
  static parsers: Map<string, AbstractParser> = new Map();

  static {
    const medqa = new MedQAParser();
    this.parsers.set(MedQAParser.identifier, medqa);

    const mmluPro = new MMLUProParser();
    this.parsers.set(MMLUProParser.identifier, mmluPro);

    const pb = new PBParser();
    this.parsers.set(PBParser.identifier, pb);

    // TODO: Add more default parsers here
  }

  /**
   * Tries to parse data from a file path with one of the available parsers.
   * @example
   * ```typescript
   * const { result, parser } = await DataParser.parseFile("path/to/file.json");
   * ```
   */
  static async parseFile(path: string) {
    if (typeof window === "undefined") {
      const { statSync } = await import("node:fs");

      if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
        throw new Error(`File does not exist: ${path}`);
      }

      for (const parser of this.parsers.values()) {
        try {
          return {
            result: await parser.parseFile(path),
            parser,
          };
        } catch {
          continue;
        }
      }
      throw new Error(`No parser could parse the file: ${path}`);
    } else {
      throw new Error(
        "File system operations are not supported in browser environment. Use `parseContent` instead."
      );
    }
  }

  /**
   * Tries to parse data from a string or ArrayBuffer content with one of the available parsers.
   * @example
   * ```typescript
   * // With string content
   * const { result, parser } = await DataParser.parseContent('{"question": "What is...", ...}');
   *
   * // With file upload in browser
   * const file = event.target.files[0];
   * const content = await file.arrayBuffer();
   * const { result, parser } = await DataParser.parseContent(content);
   * ```
   */
  static async parseContent(content: string | Uint8Array) {
    for (const parser of this.parsers.values()) {
      try {
        return {
          result: await parser.parseContent(content),
          parser,
        };
      } catch {
        continue;
      }
    }
    throw new Error("No parser could parse the content");
  }
}
