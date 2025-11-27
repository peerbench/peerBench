"use client";

import { cn } from "@/utils/cn";
import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useState,
} from "react";
import { CopyButton } from "./copy-button";
import { MarkdownTruncatedText } from "./markdown-truncated-text";

export type LogAreaEntryType = "info" | "error" | "success" | "warning";

export type LogAreaEntry = {
  message: React.ReactNode;
  type: LogAreaEntryType;
};

export interface LogsAreaHandler {
  addLog: (message: React.ReactNode, type: LogAreaEntry["type"]) => void;
  error: (message: React.ReactNode) => void;
  info: (message: React.ReactNode) => void;
  success: (message: React.ReactNode) => void;
  warning: (message: React.ReactNode) => void;
  clearLogs: () => void;
  getLogs: () => LogAreaEntry[];
}

export interface LogsAreaProps {
  className?: string;
}

const LogsArea = forwardRef<LogsAreaHandler, LogsAreaProps>(
  ({ className }, ref) => {
    const logContainerRef = useRef<HTMLDivElement | null>(null);
    const [logs, setLogs] = useState<LogAreaEntry[]>([]);

    useImperativeHandle<LogsAreaHandler, LogsAreaHandler>(ref, () => ({
      addLog: (message, type) => {
        setLogs((prevLogs) => [...prevLogs, { message, type }]);
      },
      error: (message) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "error" }]);
      },
      info: (message) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "info" }]);
      },
      success: (message) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "success" }]);
      },
      warning: (message) => {
        setLogs((prevLogs) => [...prevLogs, { message, type: "warning" }]);
      },
      clearLogs: () => {
        setLogs([]);
      },
      getLogs: () => logs,
    }));

    // Auto-scroll to bottom when new logs are added
    useEffect(() => {
      if (
        logContainerRef.current &&
        // Scrollbar is around the bottom of the container (20% from the bottom)
        logContainerRef.current.scrollTop >
          logContainerRef.current.scrollHeight -
            logContainerRef.current.scrollHeight * 0.2
      ) {
        logContainerRef.current.scrollTop =
          logContainerRef.current.scrollHeight;
      }
    }, [logs]);

    return (
      <div
        ref={logContainerRef}
        className={cn(
          "h-[500px] overflow-y-auto border border-gray-300 rounded-md p-4 bg-gray-50 font-mono text-sm",
          className
        )}
      >
        {logs.map((entry, index) => (
          <div
            key={index}
            className={`text-black border text-md p-2 rounded-md mb-2 shadow-md transition-transform transform ${getLogColor(
              entry.type
            )}`}
          >
            <div className="flex justify-between items-center">
              {typeof entry.message === "string" ? (
                <MarkdownTruncatedText text={entry.message} />
              ) : (
                entry.message
              )}
              <CopyButton text={String(entry.message)} className="w-8 h-8" />
            </div>
          </div>
        ))}
      </div>
    );
  }
);

function getLogColor(type: LogAreaEntryType) {
  switch (type) {
    case "error":
      return "border-red-500 bg-red-300";
    case "success":
      return "border-green-500 bg-green-300";
    case "warning":
      return "border-yellow-500 bg-yellow-300/60";
    case "info":
      return "border-blue-500 bg-blue-300";
  }
  return "border-gray-500 bg-gray-300";
}

LogsArea.displayName = "LogsArea";

export default LogsArea;
