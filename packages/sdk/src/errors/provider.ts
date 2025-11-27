import { captureStackTrace } from "./polyfill";

export class ForwardError extends Error {
  startedAt: Date;
  code?: string;

  constructor(
    message: string,
    options?: ErrorOptions & { startedAt: Date; code?: string }
  ) {
    super(message, options);
    this.startedAt = options?.startedAt || new Date();
    this.code = options?.code;
    captureStackTrace(this, this.constructor);
  }
}
