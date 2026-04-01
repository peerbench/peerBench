import { readFile } from "fs/promises";

async function readJsonFile(path: string): Promise<unknown> {
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

export { readJsonFile };
