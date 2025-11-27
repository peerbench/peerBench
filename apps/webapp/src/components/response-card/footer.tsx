export interface FooterProps {
  children?: React.ReactNode;
}

export function Footer({ children }: FooterProps) {
  return <div className="mb-4">{children}</div>;
}
