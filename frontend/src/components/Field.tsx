import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  right,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
  right?: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-end justify-between gap-3">
        <span className="text-sm font-medium text-white">{label}</span>
        {right}
      </div>
      <input
        {...props}
        className={[
          "mt-2 w-full rounded-xl bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white ring-1 outline-none",
          error
            ? "ring-[rgba(239,68,68,0.55)] focus:ring-[rgba(239,68,68,0.8)]"
            : "ring-[var(--rs-border)] focus:ring-[rgba(255,107,0,0.35)]",
          "placeholder:text-[var(--rs-muted)]",
          props.className ?? "",
        ].join(" ")}
      />
      {error ? (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-sm text-[var(--rs-muted)]">{hint}</p>
      ) : null}
    </label>
  );
}

