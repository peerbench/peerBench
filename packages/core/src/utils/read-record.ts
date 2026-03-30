import { isNonNullRecord } from "@/utils/is-non-null-record";

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return isNonNullRecord(value) ? value : undefined;
}

export { readRecord };
