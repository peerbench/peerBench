import { captureStackTrace } from "./polyfill";

export class InvalidDataError extends Error {
  constructor(message?: string) {
    super(message || "Data is in an invalid format");
    this.name = "InvalidDataError";
    captureStackTrace(this, this.constructor);
  }
}

export class ParserIsNotCompatibleError extends InvalidDataError {
  constructor() {
    super("Parser is not compatible with the data");
    this.name = "ParserIsNotCompatibleError";
    captureStackTrace(this, this.constructor);
  }
}
