export interface InfoSectionProps {
  title: string;
  children: React.ReactNode;
}

export function InfoSection({ title, children }: InfoSectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}
