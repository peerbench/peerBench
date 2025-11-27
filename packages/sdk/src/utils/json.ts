import { stringify } from "safe-stable-stringify";
import { calculateCID } from "./cid";
import { calculateSHA256 } from "./sha256";

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

/**
 * Stable stringifies (using `stableStringify` function) and hash
 * the given object and returns the string representations of those hashes
 * (using `calculateCID` and `calculateSHA256` functions).
 * If the given object cannot be stringified, then it throws an error.
 */
export async function hashObject(obj: any) {
  const stringified = stableStringify(obj);

  if (!stringified) {
    throw new Error("The given object cannot be stringified");
  }

  const [cid, sha256] = await Promise.all([
    calculateCID(stringified).then((c) => c.toString()),
    calculateSHA256(stringified),
  ]);

  return {
    cid,
    sha256,
  };
}
