import React, { useRef } from "react";
import { Button } from "./button";
import { VariantProps } from "class-variance-authority";
import { buttonVariants } from "./button";
import { cn } from "@/utils/cn";

type FileInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size" | "accept"
> & {
  label?: string;
  buttonClassName?: string;
  onFileSelect?: (file: File) => void;
  accept?: string | string[];
  multiple?: boolean;
  icon?: React.ReactNode;
  variant?: VariantProps<typeof buttonVariants>["variant"];
  size?: VariantProps<typeof buttonVariants>["size"];
};

export const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  (
    {
      label = "Choose File",
      className,
      buttonClassName,
      onFileSelect,
      accept,
      multiple = false,
      icon,
      variant,
      size,
      ...props
    },
    forwardedRef
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onFileSelect) {
        onFileSelect(file);
      }
    };

    const handleClick = () => {
      inputRef.current?.click();
    };

    return (
      <div className={cn("relative", className)}>
        <input
          type="file"
          ref={(node) => {
            // Handle both forwarded ref and local ref
            if (typeof forwardedRef === "function") {
              forwardedRef(node);
            } else if (forwardedRef) {
              forwardedRef.current = node;
            }
            inputRef.current = node;
          }}
          onChange={handleChange}
          accept={typeof accept === "string" ? accept : accept?.join(",")}
          multiple={multiple}
          className="hidden"
          {...props}
        />
        <Button
          type="button"
          variant={variant || "default"}
          size={size || "default"}
          onClick={handleClick}
          disabled={props.disabled}
          className={cn("flex items-center gap-2", buttonClassName)}
        >
          {icon}
          {label}
        </Button>
      </div>
    );
  }
);

FileInput.displayName = "FileInput";
