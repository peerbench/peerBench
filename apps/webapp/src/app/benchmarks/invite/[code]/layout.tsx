export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="h-[calc(100vh-100px)] flex items-center justify-center">
      {children}
    </main>
  );
}
