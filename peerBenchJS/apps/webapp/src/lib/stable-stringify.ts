import { stringify } from "safe-stable-stringify";

/**
 * Stable stringify the given value
 */
export function stableStringify(value: any) {
  return stringify(value);
}
