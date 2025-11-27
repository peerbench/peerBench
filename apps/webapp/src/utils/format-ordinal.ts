/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 * @param n - The number to format
 * @returns The formatted ordinal number
 * @ai
 */
export function formatOrdinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s![(v - 20) % 10] || s![v] || s![0]!);
}
