"use client";

import { cn } from "@/utils/cn";
import { useState } from "react";

interface TruncatedTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  onClickShowMore?: (isShowingFullText: boolean) => void;
}

export function TruncatedText({
  text,
  className,
  maxLength = 300,
  onClickShowMore,
}: TruncatedTextProps) {
  const [isShowingFullText, setIsShowingFullText] = useState(false);

  const handleToggleClick = () => {
    if (onClickShowMore) {
      onClickShowMore(isShowingFullText);
    } else {
      setIsShowingFullText((prev) => !prev);
    }
  };

  const shouldTruncate = (text?.length || 0) > maxLength;

  return (
    <pre className={cn("whitespace-pre-wrap break-words font-sans", className)}>
      {shouldTruncate ? (
        <div>
          {isShowingFullText ? text : text?.slice(0, maxLength) + "..."}
          <a
            onClick={handleToggleClick}
            className="text-blue-500 underline hover:cursor-pointer ml-3"
          >
            {isShowingFullText ? "less" : "more"}
          </a>
        </div>
      ) : (
        text || ""
      )}
    </pre>
  );
}
