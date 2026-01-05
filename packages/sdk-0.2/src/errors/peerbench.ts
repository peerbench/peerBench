import { captureStackTrace } from "./polyfill";

export class PeerbenchError extends Error {
  code: number;

  constructor(message?: string, options?: ErrorOptions & { code: number }) {
    super(message, options);
    this.code = options?.code ?? 0;
    captureStackTrace(this, this.constructor);
  }
}
