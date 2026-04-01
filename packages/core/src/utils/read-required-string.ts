import { readString } from "@/utils/read-string";

function readRequiredString(value: unknown, field: string): string {
  const str = readString(value);
  if (!str) throw new Error(`Missing required field: ${field}`);
  return str;
}

export { readRequiredString };
