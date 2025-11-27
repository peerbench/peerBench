import { z } from "zod";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public expose: boolean = true, // whether to show message to client
    public code?: string,
    public body?: Record<string, any>
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Bad Request", code?: string) {
    return new ApiError(msg, 400, true, code);
  }
  static unauthorized(msg = "Unauthorized", code?: string) {
    return new ApiError(msg, 401, true, code);
  }
  static forbidden(msg = "Forbidden", code?: string) {
    return new ApiError(msg, 403, true, code);
  }
  static notFound(msg = "Not Found", code?: string) {
    return new ApiError(msg, 404, true, code);
  }
  static conflict(msg = "Conflict", code?: string) {
    return new ApiError(msg, 409, true, code);
  }
  static server(msg = "Internal Server Error", code?: string) {
    return new ApiError(msg, 500, false, code);
  }
  static validationError(issues: z.ZodIssue[], code?: string) {
    return new ApiError(`Validation error: ${issues[0]?.path.join(".")}: ${issues[0]?.message}`, 400, true, code, {
      issues,
    });
  }
}
