export const HEALTH_CHECK_FALLBACK_PATHS = [
  "/health",
  "/",
  "/api/health",
  "/healthz",
  "/ping",
  "/status",
  "/api/healthz",
  "/api/ping",
];

export async function tryHealthCheckUrl(
  params: TryHealthCheckUrlParams
): Promise<TryHealthCheckUrlResult> {
  const { url, timeoutMs = 5000 } = params;
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    if (response.ok) {
      return { success: true, statusCode: response.status, responseTimeMs };
    } else {
      return {
        success: false,
        statusCode: response.status,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        responseTimeMs,
      };
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    let errorMessage = "Unknown error";

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        errorMessage = `Request timed out (${timeoutMs / 1000}s)`;
      } else {
        errorMessage = error.message;
      }
    }

    return { success: false, errorMessage, responseTimeMs };
  }
}

export type TryHealthCheckUrlParams = {
  url: string;
  timeoutMs?: number;
};

export type TryHealthCheckUrlResult = {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  responseTimeMs: number;
};
