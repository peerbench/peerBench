"use client";

import { cn } from "@/utils/cn";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { motion } from "motion/react";

export interface AlertProps {
  children?: React.ReactNode;
  variant?: "destructive" | "info" | "success" | "warning";
  className?: string;
}

export default function Alert({
  children,
  variant = "destructive",
  className,
}: AlertProps) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("text-sm flex items-center gap-1", className, {
        "text-red-600": variant === "destructive",
        "text-blue-600": variant === "info",
        "text-green-600": variant === "success",
        "text-yellow-600": variant === "warning",
      })}
    >
      {variant === "destructive" && <AlertCircle className="w-4 h-4" />}
      {variant === "info" && <Info className="w-4 h-4" />}
      {variant === "success" && <CheckCircle className="w-4 h-4" />}
      {variant === "warning" && <AlertTriangle className="w-4 h-4" />}
      {children}
    </motion.p>
  );
}
