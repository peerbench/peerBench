// This is an internal polyfill that is used by custom Error classes
// to make them work in both Node.js and browser environments.

export function captureStackTrace(
  error: Error,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  constructor: Function
) {
  if (typeof window === "undefined") {
    Error.captureStackTrace(error, constructor);
  } else {
    error.stack = new Error(error.message).stack;
  }
}
