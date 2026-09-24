type Variant = "primary" | "secondary" | "ghost";

export function Button({
  variant = "primary", children, className = "", ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition";
  const variants: Record<Variant, string> = {
    primary:   "bg-primary text-white hover:brightness-110",
    secondary: "bg-surface border border-border text-text-primary hover:bg-background",
    ghost:     "text-text-secondary hover:bg-background",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}