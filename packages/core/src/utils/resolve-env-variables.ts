function resolveEnvVariables(
  config: Record<string, unknown>,
  missingVars?: string[],
): Record<string, unknown> {
  const isRoot = !missingVars;
  const missing = missingVars ?? [];
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(config)) {
    if (key.toLowerCase().endsWith(":env") && typeof value === "string") {
      const baseKey = key.slice(0, -4);
      const envValue = process.env[value];
      if (!envValue) {
        missing.push(`${value} (referenced by "${key}")`);
        result[baseKey] = "";
      } else {
        result[baseKey] = envValue;
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === "object" && item !== null
          ? resolveEnvVariables(item as Record<string, unknown>, missing)
          : item,
      );
    } else if (typeof value === "object" && value !== null) {
      result[key] = resolveEnvVariables(
        value as Record<string, unknown>,
        missing,
      );
    } else {
      result[key] = value;
    }
  }

  if (isRoot && missing.length > 0) {
    throw new Error(
      `Missing environment variables:\n${missing.map((m) => `  - ${m}`).join("\n")}`,
    );
  }

  return result;
}

export { resolveEnvVariables };
