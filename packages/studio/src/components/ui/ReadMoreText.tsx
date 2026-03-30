import { useState } from "react";

interface ReadMoreTextProps {
  text: string;
  maxLength?: number;
  className?: string;
}

export function ReadMoreText({
  text,
  maxLength = 200,
  className = "",
}: ReadMoreTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (text.length <= maxLength) {
    return (
      <div className={`text-sm text-gray-900 whitespace-pre-wrap break-words ${className}`}>
        {text}
      </div>
    );
  }

  const truncated = text.substring(0, maxLength);
  const displayText = isExpanded ? text : truncated;
  const hasMore = text.length > maxLength;

  return (
    <div className={`text-sm text-gray-900 whitespace-pre-wrap break-words ${className}`}>
      {displayText}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 text-blue-600 hover:text-blue-800 text-xs font-medium underline"
        >
          {isExpanded ? "read less" : "read more"}
        </button>
      )}
    </div>
  );
}
