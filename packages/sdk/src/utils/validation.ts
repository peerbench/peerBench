import { z } from "zod";

/**
 * Extracts the first error message (if there is any)
 * from a Zod safe parse result and format it.
 * @param safeParseReturn
 * @param path Path of the parsing object. It will be used to indicate the invalid field if the info is not available in the validation error.
 */
export function parseValidationError<T, K>(
  safeParseReturn: z.SafeParseReturnType<T, K>,
  path?: string
) {
  path ??= "";

  if (safeParseReturn?.error) {
    const firstError = safeParseReturn.error.errors[0];

    if (path) {
      path = `${path}: `;
    }

    // Include path if there is
    path =
      firstError.path.length > 0 ? `"${firstError.path.join(".")}": ` : path;
    return `${path}${firstError.message}`;
  }
}

/**
 * Checks the error state of the given Zod safe parse result
 * and throws an error if there is any.
 * @param safeParseReturn
 * @param path Path of the parsing object. It will be used to indicate the invalid field if the info is not available in the validation error.
 */
export function checkValidationError<T, K>(
  safeParseReturn: z.SafeParseReturnType<T, K>,
  path?: string
) {
  if (safeParseReturn?.error) {
    throw new Error(parseValidationError(safeParseReturn, path));
  }

  return safeParseReturn.data;
}
