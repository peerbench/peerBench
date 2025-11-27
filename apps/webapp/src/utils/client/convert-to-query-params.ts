/**
 * Converts fields of the given object to query params and returns the query string.
 */
export function convertToQueryParams(
  params?: Record<string, any | any[] | undefined | null>,
  shouldInclude?: (
    key: string,
    value: any | any[] | undefined | null
  ) => boolean
) {
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (shouldInclude && !shouldInclude(key, value)) {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((v) => {
        const stringifiedValue = convertToString(v);
        if (stringifiedValue !== undefined) {
          queryParams.append(key, stringifiedValue);
        }
      });
    } else {
      const stringifiedValue = convertToString(value);
      if (stringifiedValue !== undefined) {
        queryParams.set(key, stringifiedValue);
      }
    }
  }

  return queryParams.toString();
}

/**
 * Converts the given value to a string only if it is not "empty"
 */
function convertToString(value: any) {
  // Check the emptiness of the value for different types
  if (value === undefined || value === null) {
    return;
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    if (isNaN(value)) {
      return;
    }
  }

  if (typeof value === "string") {
    if (value === "") {
      return;
    }
  }

  return value.toString();
}
