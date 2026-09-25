type Status = "success" | "danger" | "neutral"| "warning";

const styles: Record<Status, string> = {
  success: "bg-success-soft text-success",
  danger:  "bg-danger-soft  text-danger",
  neutral: "bg-neutral-soft text-neutral",
  warning: "bg-amber-100 text-amber-800",
};

export function StatusPill({ status, children }: { status: Status; children: React.ReactNode }) {
       const currentStyle = styles[status] ?? styles.neutral; 
       
	return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-pill text-xs font-medium ${styles[status]}`}
      style={{ borderRadius: "var(--radius-pill)" }}
    >
      {children}
    </span>
  );
}
