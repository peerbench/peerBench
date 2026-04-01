import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  generateCurlCommand,
  type RawRequestMetadata,
} from "@/lib/curl-generator";

export function CopyAsCurlButton({
  rawRequest,
}: {
  rawRequest: RawRequestMetadata;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const curl = generateCurlCommand(rawRequest);
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy as cURL"}
    </Button>
  );
}
