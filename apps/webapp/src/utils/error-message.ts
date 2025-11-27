import { ensureError } from "./ensure-error";

/**
 * Extracts the message of the error or cast it to a String if it is not an `Error` instance
 */
export function errorMessage(err: unknown) {
  return ensureError(err).message;
}
