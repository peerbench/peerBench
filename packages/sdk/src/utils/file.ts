/**
 * Reads the file and returns the content as a string.
 * @param path - The path to the file.
 * @returns The content of the file as a string.
 */
export async function readFile(path: string): Promise<Uint8Array> {
  if (typeof window === "undefined") {
    // Node.js environment
    const { readFileSync, statSync } = await import("node:fs");
    if (!statSync(path, { throwIfNoEntry: false })?.isFile()) {
      throw new Error(`File doesn't exist: ${path}`);
    }

    return readFileSync(path);
  } else {
    // Browser environment
    throw new Error(
      "File system operations are not supported in browser environment. Use readFromContent instead."
    );
  }
}
