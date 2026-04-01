export function generateCurlCommand(rawRequest: RawRequestMetadata): string {
  const parts: string[] = ["curl"];

  if (rawRequest.method !== "GET") {
    parts.push(`-X ${rawRequest.method}`);
  }

  parts.push(`'${rawRequest.url}'`);

  for (const [key, value] of Object.entries(rawRequest.headers)) {
    parts.push(`-H '${key}: ${value}'`);
  }

  if (rawRequest.body) {
    const bodyStr =
      typeof rawRequest.body === "string"
        ? rawRequest.body
        : JSON.stringify(rawRequest.body);
    parts.push(`-d '${escapeSingleQuotes(bodyStr)}'`);
  }

  return parts.join(" \\\n  ");
}

function escapeSingleQuotes(str: string): string {
  return str.replace(/'/g, "'\\''");
}

export type RawRequestMetadata = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  response?: {
    status: number;
    statusText: string;
  };
};
