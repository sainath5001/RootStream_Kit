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
        <span className="text-sm font-medium text-zinc-900">{label}</span>
        {right}
      </div>
      <input
        {...props}
        className={[
          "mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm ring-1",
          error ? "ring-red-300 focus:ring-red-400" : "ring-zinc-200 focus:ring-zinc-300",
          "outline-none",
          props.className ?? "",
        ].join(" ")}
      />
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-sm text-zinc-600">{hint}</p>
      ) : null}
    </label>
  );
}

