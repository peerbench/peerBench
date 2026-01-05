import { stringify } from "safe-stable-stringify";

/**
 * Parses JSONL formatted string into an array
 * @returns An array of parsed JSON lines
 */
export function parseJSONL<T>(
  str: string,
  options?: { errorOnInvalid?: boolean }
): T[] {
  return str
    .split("\n") // Split per line
    .filter((line) => line.trim() !== "") // Filter empty lines
    .map((line) => {
      const obj = tryParseJson(line);
      if (options?.errorOnInvalid && !obj) {
        throw new Error(`Invalid JSON line: ${line}`);
      }
      return obj;
    }) // Parse line (parse as undefined if it is invalid)
    .filter((obj) => obj !== undefined); // Filter invalid lines
}

/**
 * Tries to parse the given string as JSON.
 * Returns `undefined` if it is not a valid JSON entity.
 */
export function tryParseJson<T = any>(content: string): T | undefined {
  try {
    return JSON.parse(content);
  } catch {
    // Invalid JSON
  }
}

/**
 * Stringifies the given JSON value using `safe-stable-stringify` in a stable manner.
 * This stable method generates the same string output for the same input value (including objects).
 */
export function stableStringify(value: any) {
  return stringify(value);
}
