type NormalizeOptions = "string" | "date";

/**
 * Takes the given value and normalizes it to the desired data type.
 */
export function normalizeDate(
  value: string | Date,
  normalizeTo?: "string"
): string;
export function normalizeDate(value: string | Date, normalizeTo: "date"): Date;
export function normalizeDate(
  value: string | Date,
  normalizeTo: NormalizeOptions = "string"
) {
  if (normalizeTo === "string" && typeof value !== "string") {
    return value.toISOString();
  }

  if (normalizeTo === "date" && !(value instanceof Date)) {
    return new Date(value);
  }

  return value;
}
