export interface HeaderProps {
  children?: React.ReactNode;
}

export function Header({ children }: HeaderProps) {
  return <div className="mt-4">{children}</div>;
}
