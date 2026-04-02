"use client";

import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--rs-border)] bg-[rgba(255,255,255,0.03)] p-6">
      <div className="text-sm font-semibold text-white">{title}</div>
      {description ? <div className="mt-1 text-sm text-[var(--rs-muted)]">{description}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

