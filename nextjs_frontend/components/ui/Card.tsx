export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`bg-surface border border-border rounded-card shadow-card ${className}`}
      style={{ borderRadius: "var(--radius-card)" }}
    >
      {children}
    </section>
  );
}