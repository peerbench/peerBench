export interface InfoFieldProps {
  label: string;
  value: string | number | undefined;
  spanFull?: boolean;
  paragraph?: boolean;
}

export function InfoField({
  label,
  value,
  spanFull = false,
  paragraph = false,
}: InfoFieldProps) {
  if (value === undefined) return null;
  return (
    <div className={spanFull ? "col-span-2" : ""}>
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>{" "}
      {paragraph ? (
        <p className="text-gray-900 p-2 bg-gray-100 mt-2 rounded border border-gray-200">
          {value}
        </p>
      ) : (
        <span className="text-gray-900 dark:text-gray-100">{value}</span>
      )}
    </div>
  );
}
