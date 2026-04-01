import { readString } from "@/utils/read-string";

function readNullableString(value: unknown): string | null {
  if (value === null) return null;
  return readString(value) ?? null;
}

export { readNullableString };
