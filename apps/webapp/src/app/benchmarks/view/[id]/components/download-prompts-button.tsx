"use client";

import { Button } from "@/components/ui/button";
import { LucideDownload } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { downloadAllPromptsAction } from "../actions/download-prompts";

export interface DownloadPromptsButtonProps {
  promptSetId: number;
  promptSetTitle: string;
  userId?: string;
}

export function DownloadPromptsButton({
  promptSetId,
  promptSetTitle,
  userId,
}: DownloadPromptsButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    const loadingToast = toast.loading("Preparing download...");

    try {
      const result = await downloadAllPromptsAction({
        promptSetId,
        userId,
      });

      // Create a blob with the prompts data
      const blob = new Blob([JSON.stringify(result.prompts, null, 2)], {
        type: "application/json",
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Sanitize the title for filename
      const sanitizedTitle = promptSetTitle
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      a.download = `${sanitizedTitle}_prompts.peerbench.json`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(
        `Downloaded ${result.totalCount} prompt(s) successfully!`
      );
    } catch (error) {
      console.error(error);
      toast.error(
        `Failed to download prompts: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsDownloading(false);
      toast.dismiss(loadingToast);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant="outline"
      size="sm"
    >
      <LucideDownload className="w-4 h-4 mr-2" />
      {isDownloading ? "Downloading..." : "Download All Prompts"}
    </Button>
  );
}
