import { AlertCircle } from "lucide-react";
import { FieldError } from "react-hook-form";
import { ReactNode } from "react";

type ErrorPosition = "above" | "below";

export interface FormInputErrorProps {
  error?: FieldError | string | null;
  position?: ErrorPosition;
  className?: string;
  showIcon?: boolean;
  children: ReactNode;
}

export function FormInputError({
  error,
  position = "below",
  className = "",
  showIcon = true,
  children,
}: FormInputErrorProps) {
  if (position === "below") {
    return (
      <>
        {children}
        <ErrorText
          error={error}
          position={position}
          className={className}
          showIcon={showIcon}
        />
      </>
    );
  }

  if (position === "above") {
    return (
      <>
        <ErrorText
          error={error}
          position={position}
          className={className}
          showIcon={showIcon}
        />
        {children}
      </>
    );
  }
}

function ErrorText({
  error,
  position,
  className,
  showIcon,
}: Omit<FormInputErrorProps, "children">) {
  const errorMessage = typeof error === "string" ? error : error?.message;
  const hasError = !!error && !!errorMessage;

  if (!hasError) {
    return null;
  }

  return (
    <p
      className={`text-sm text-red-600 flex items-center gap-1 ${
        position === "above" ? "mb-1" : position === "below" ? "mt-1" : ""
      } ${className}`}
    >
      {showIcon && <AlertCircle className="h-4 w-4 flex-shrink-0" />}
      <span>{errorMessage}</span>
    </p>
  );
}
