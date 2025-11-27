"use client";

import { cn } from "@/utils/cn";
import { useState } from "react";
import { MarkdownText } from "./markdown-text";

interface MarkdownTruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  onClickShowMore?: (isShowingFullText: boolean) => void;
}

/**
 * Renders markdown text with truncation and "show more/less" toggle
 */
export function MarkdownTruncatedText({
  text,
  className,
  maxLength = 300,
  onClickShowMore,
}: MarkdownTruncatedTextProps) {
  const [isShowingFullText, setIsShowingFullText] = useState(false);

  const handleToggleClick = () => {
    if (onClickShowMore) {
      onClickShowMore(isShowingFullText);
    } else {
      setIsShowingFullText((prev) => !prev);
    }
  };

  const shouldTruncate = (text?.length || 0) > maxLength;
  const displayText = shouldTruncate && !isShowingFullText
    ? text?.slice(0, maxLength) + "..."
    : text || "";

  return (
    <div className={cn("break-words font-sans relative", className)}>
      <MarkdownText>{displayText}</MarkdownText>
      {shouldTruncate && (
        <div className="flex justify-end mt-2">
          <a
            onClick={handleToggleClick}
            className="text-blue-500 underline hover:cursor-pointer text-sm"
          >
            {isShowingFullText ? "show less" : "show more"}
          </a>
        </div>
      )}
    </div>
  );
}

