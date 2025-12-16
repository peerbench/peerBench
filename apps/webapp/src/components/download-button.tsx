"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LucideDownload } from "lucide-react";
import { MaybePromise } from "peerbench";

export type DownloadButtonContentGenerator = () => MaybePromise<{
  data: string;
  filename?: string;
}>;

type DownloadButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "onClick" | "content"
> & {
  /**
   * A function that returns the content and an optional filename to download
   */
  content: DownloadButtonContentGenerator;
  /**
   * MIME type for the blob (default: "text/plain")
   */
  mimeType?: string;
  /**
   * Callback fired when download starts
   */
  onDownloadStart?: () => void;
  /**
   * Callback fired when download completes successfully
   */
  onDownloadSuccess?: () => void;
  /**
   * Callback fired when download fails
   */
  onDownloadError?: (error: Error) => void;
};

export function DownloadButton({
  content,
  mimeType = "text/plain",
  onDownloadStart,
  onDownloadSuccess,
  onDownloadError,
  children,
  disabled,
  ...buttonProps
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);

  const handleDownload = async () => {
    setIsPreparing(true);
    const { data: contentToDownload, filename } = await content();
    setIsPreparing(false);

    setIsDownloading(true);
    onDownloadStart?.();

    try {
      if (contentToDownload === undefined) {
        throw new Error("No content provided for download");
      }

      // Create a blob with the content
      const blob = new Blob([contentToDownload], { type: mimeType });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "download.txt";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onDownloadSuccess?.();
    } catch (error) {
      console.error("Error downloading file:", error);
      const err = error instanceof Error ? error : new Error(String(error));
      onDownloadError?.(err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || isDownloading || isPreparing || !content}
      {...buttonProps}
    >
      <LucideDownload className="w-4 h-4" />
      {children ||
        (isPreparing
          ? "Preparing..."
          : isDownloading
            ? "Downloading..."
            : "Download")}
    </Button>
  );
}
