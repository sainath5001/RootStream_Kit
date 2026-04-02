"use client";

export function Badge({ tone, children }: { tone: "active" | "cancelled"; children: string }) {
  const cls =
    tone === "active"
      ? "bg-[rgba(34,197,94,0.12)] text-green-300 ring-[rgba(34,197,94,0.25)]"
      : "bg-[rgba(161,161,170,0.12)] text-[var(--rs-muted)] ring-[rgba(161,161,170,0.2)]";
  return <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs ring-1 ${cls}`}>{children}</span>;
}

