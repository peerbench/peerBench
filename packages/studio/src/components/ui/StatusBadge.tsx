type Status = "pending" | "running" | "completed" | "failed" | "partial" | "success";

interface StatusBadgeProps {
  status: Status;
  size?: "sm" | "md";
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-gray-100 text-gray-800",
  },
  running: {
    label: "Running",
    className: "bg-blue-100 text-blue-800",
  },
  completed: {
    label: "Completed",
    className: "bg-green-100 text-green-800",
  },
  success: {
    label: "Success",
    className: "bg-green-100 text-green-800",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-800",
  },
  partial: {
    label: "Partial",
    className: "bg-yellow-100 text-yellow-800",
  },
};

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  const sizeClass = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium ${config.className} ${sizeClass}`}
    >
      {config.label}
    </span>
  );
}
