import { toast } from "react-toastify";
import { ApiError } from "./api";

export function toastError(
  error: unknown,
  fallbackMessage = "Something went wrong"
): void {
  const message = errorToMessage(error) ?? fallbackMessage;
  console.error("[Toast Error]", message, error);

  if (error instanceof ApiError && error.validationErrors?.length) {
    const errorDetails = error.validationErrors
      .slice(0, 5)
      .map((e) => `• ${e.path}: ${e.message}`)
      .join("\n");
    const suffix =
      error.validationErrors.length > 5
        ? `\n...and ${error.validationErrors.length - 5} more`
        : "";
    toast.error(`${message}:\n${errorDetails}${suffix}`, {
      autoClose: false,
      style: { whiteSpace: "pre-wrap" },
    });
  } else {
    toast.error(`${message} (see console for details)`);
  }
}

export function toastSuccess(message: string): void {
  console.log("[Toast Success]", message);
  toast.success(message);
}

export function toastInfo(message: string): void {
  console.info("[Toast Info]", message);
  toast.info(message);
}

export function toastWarning(message: string): void {
  console.warn("[Toast Warning]", message);
  toast.warning(message);
}

function errorToMessage(error: unknown): string | null {
  if (error instanceof Error) return error.message || null;
  if (typeof error === "string") return error;
  if (typeof error === "object" && error !== null) {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return maybeMessage;
  }
  return null;
}
