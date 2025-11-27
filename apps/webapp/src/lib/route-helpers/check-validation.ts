import { ApiError } from "@/errors/api-error";
import { z } from "zod";

/**
 * Checks if the validation is successful. If not, throws a relevant `ApiError`.
 */
export function checkValidation<T, K>(
  validation: z.SafeParseReturnType<T, K>
): K {
  if (!validation.success) {
    throw ApiError.validationError(validation.error.issues);
  }

  return validation.data;
}
