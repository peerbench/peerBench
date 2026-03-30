import { readFile } from "fs/promises";

async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf-8");
}

export { readTextFile };
