"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  iconSize?: number;
}

export function CopyButton({
  text,
  label,
  variant = "outline",
  className,
  disabled = false,
  iconSize = 16,
  children,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  if (children) {
    return (
      <div
        onClick={handleCopy}
        className={cn(
          "flex items-center gap-2 transition-all duration-200 hover:text-muted-foreground",
          className,
          "hover:cursor-pointer select-none"
        )}
      >
        {children}
        {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      </div>
    );
  }

  return (
    <Button
      variant={variant}
      className={cn("transition-all duration-200", className)}
      onClick={handleCopy}
      disabled={disabled}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? <Check size={iconSize} /> : <Copy size={iconSize} />}
      {label && (
        <span className={label ? "ml-2" : ""}>
          {copied ? "Copied!" : label}
        </span>
      )}
    </Button>
  );
}
