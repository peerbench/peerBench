/**
 * Checks the thrown value and if it is not something
 * that inherited from Error, converts it to a plain Error object.
 * If it is something that inherited from Error then just returns it.
 */
export function ensureError(value: unknown): Error {
  if (value instanceof Error) return value;

  let stringified = "[Unable to stringify the thrown value]";
  try {
    stringified = JSON.stringify(value);
  } catch {
    // The value cannot be stringified.
  }

  const error = new Error(
    `This value was thrown as is, not through an Error: ${stringified}`
  );
  return error;
}
