"use client";

import ReactMarkdown from "react-markdown";
import { cn } from "@/utils/cn";

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Renders markdown text with proper styling for AI responses
 * Preserves whitespace and newlines while supporting markdown syntax
 */
export function MarkdownText({ children, className }: MarkdownTextProps) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none whitespace-pre-wrap",
        "prose-headings:font-semibold prose-headings:text-gray-900 prose-headings:my-0",
        "prose-p:text-gray-700 prose-p:leading-tight prose-p:my-0",
        "prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline",
        "prose-code:text-pink-600 prose-code:bg-pink-50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:whitespace-pre-wrap",
        "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:whitespace-pre-wrap prose-pre:break-words prose-pre:my-0",
        "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:pl-2 [&_ul]:my-0 [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:pl-2 [&_ol]:my-0",
        "[&_li]:text-gray-700 [&_li]:my-0",
        "prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-0",
        "prose-strong:text-gray-900 prose-strong:font-semibold",
        "prose-em:text-gray-700 prose-em:italic",
        className
      )}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  );
}

