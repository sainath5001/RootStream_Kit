import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ className = "", variant = "primary", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-[var(--rs-orange)] text-black hover:opacity-95 rs-glow"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "bg-[rgba(255,255,255,0.06)] text-white ring-1 ring-[var(--rs-border)] hover:bg-[rgba(255,255,255,0.10)]";

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

