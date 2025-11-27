"use client";

import { useRef, useState } from "react";
import { LucideUpload, LucideFile } from "lucide-react";
import { cn } from "@/utils/cn";

export interface FileDropZoneProps {
  /**
   * Callback function called when a file is selected or dropped
   */
  onFileSelect: (file: File) => void | Promise<void>;
  /**
   * Accepted file types (e.g., ".json,.jsonl,.parquet" or ["image/*"])
   */
  accept?: string | string[];
  /**
   * Whether the drop zone is disabled
   */
  disabled?: boolean;
  /**
   * Name of the currently selected file (if any)
   */
  selectedFileName?: string | null;
  /**
   * Custom className for the drop zone container
   */
  className?: string;
  /**
   * Description text for accepted file types (e.g., "Supports: .json, .jsonl, .parquet")
   */
  acceptDescription?: string;
  /**
   * Custom empty state text
   */
  emptyText?: string;
  /**
   * Custom drag over text
   */
  dragOverText?: string;
  /**
   * Custom text when file is selected
   */
  fileSelectedText?: string;
  /**
   * Whether to allow multiple file selection
   */
  multiple?: boolean;
}

export function FileDropZone({
  onFileSelect,
  accept,
  disabled = false,
  selectedFileName,
  className,
  acceptDescription,
  emptyText = "Click to upload or drag and drop",
  dragOverText = "Drop file here",
  fileSelectedText = "Click or drag to replace file",
  multiple = false,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onFileSelect(file);
      // Reset the file input to trigger the onChange event again even if
      // user selects the same file.
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) {
      return;
    }

    const file = e.dataTransfer.files?.[0];
    if (file) {
      await onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const acceptString = typeof accept === "string" ? accept : accept?.join(",");

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
        onChange={handleFileChange}
        disabled={disabled}
        multiple={multiple}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        {selectedFileName ? (
          <div className="flex flex-col items-center gap-2">
            <LucideFile className="w-12 h-12 text-primary" />
            <div className="text-sm font-medium text-foreground">
              {selectedFileName}
            </div>
            <div className="text-xs text-muted-foreground">
              {fileSelectedText}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <LucideUpload className="w-12 h-12 text-muted-foreground" />
            <div className="text-sm font-medium text-foreground">
              {isDragging ? dragOverText : emptyText}
            </div>
            {acceptDescription && (
              <div className="text-xs text-muted-foreground">
                {acceptDescription}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
