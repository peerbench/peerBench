import pino from "pino";

const isDevelopment = (process.env.NODE_ENV ?? "development") !== "production";
const shouldPrettyPrint =
  isDevelopment && process.stdout.isTTY && process.env.LOG_PRETTY !== "0";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  ...(shouldPrettyPrint
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        },
      }
    : {}),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "authorization",
      "cookie",
      "config.apiKey",
      "config.scorerApiKey",
      "config.authBearerToken",
      "configSnapshot.apiKey",
      "configSnapshot.scorerApiKey",
      "configSnapshot.authBearerToken",
      "apiKey",
      "scorerApiKey",
      "authBearerToken",
    ],
    censor: "[REDACTED]",
  },
});

export function createRunLogger(params: {
  runId?: string;
  source: string;
}): RunLogger {
  const runId = params.runId;
  const source = params.source;
  const base = logger.child({ runId, source });

  function logWithDb(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ): void {
    if (data) {
      base[level]({ data }, message);
    } else {
      base[level](message);
    }
  }

  return {
    debug: (message, data) => logWithDb("debug", message, data),
    info: (message, data) => logWithDb("info", message, data),
    warn: (message, data) => logWithDb("warn", message, data),
    error: (message, data) => logWithDb("error", message, data),
    errorWithCause: (message, cause, data) => {
      const errData = serializeError(cause);
      logWithDb("error", message, { ...data, error: errData });
    },
  };
}

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  if (typeof err === "string") {
    return { message: err };
  }

  if (typeof err === "object" && err !== null) {
    const asRecord: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(err)) {
      asRecord[key] = value;
    }
    return asRecord;
  }

  return { message: String(err) };
}

type LogLevel = "debug" | "info" | "warn" | "error";

type RunLogger = {
  debug: (message: string, data?: Record<string, unknown>) => void;
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  errorWithCause: (
    message: string,
    cause: unknown,
    data?: Record<string, unknown>
  ) => void;
};
