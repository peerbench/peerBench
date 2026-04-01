import { useState } from "react";

interface JsonDisplayProps {
  data: unknown;
  maxHeight?: number;
  className?: string;
}

export function JsonDisplay({
  data,
  maxHeight = 400,
  className = "",
}: JsonDisplayProps) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded transition-colors"
        title="Copy JSON"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre
        className={`bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm font-mono ${className}`}
        style={{ maxHeight }}
      >
        <code>{jsonString}</code>
      </pre>
    </div>
  );
}
