let parsed: Record<string, string> | null = null;

function load(): Record<string, string> {
  if (parsed) return parsed;
  const raw = process.env.DEFAULT_AUTH_TOKENS;
  if (!raw) {
    parsed = {};
    return parsed;
  }
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    parsed = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string") {
        parsed[key.toLowerCase()] = value;
      }
    }
  } catch {
    parsed = {};
  }
  return parsed;
}

function resolve(value: string): string | undefined {
  if (value.startsWith("env:")) {
    const envName = value.slice(4);
    return process.env[envName] || undefined;
  }
  return value || undefined;
}

function getDefaultAuthToken(url: string): string | undefined {
  const map = load();
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const raw = map[hostname];
    return raw ? resolve(raw) : undefined;
  } catch {
    return undefined;
  }
}

function extractUrlFromParams(
  params: Record<string, unknown>,
): string | undefined {
  const candidate =
    typeof params.baseUrl === "string"
      ? params.baseUrl
      : typeof params.endpoint === "string"
        ? params.endpoint
        : undefined;

  if (!candidate) return undefined;

  try {
    new URL(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

function injectDefaultAuthToken(
  params: Record<string, unknown>,
): Record<string, unknown> {
  if (params.authToken) return params;

  const url = extractUrlFromParams(params);
  if (!url) return params;

  const token = getDefaultAuthToken(url);
  if (!token) return params;

  return { ...params, authToken: token };
}

export { getDefaultAuthToken, injectDefaultAuthToken };
