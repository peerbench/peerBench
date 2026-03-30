function resolveEnvOrString(
  config: Record<string, unknown>,
  key: string
): string | undefined {
  const direct = config[key];
  if (typeof direct === "string" && direct.length > 0) return direct;

  const envKey = config[`${key}_ENV`];
  if (typeof envKey !== "string" || envKey.length === 0) return undefined;
  const envValue = process.env[envKey];
  return typeof envValue === "string" && envValue.length > 0
    ? envValue
    : undefined;
}

export { resolveEnvOrString };
