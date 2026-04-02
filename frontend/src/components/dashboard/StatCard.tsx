"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function StatCard({
  icon,
  title,
  value,
  loading,
  footer,
}: {
  icon: ReactNode;
  title: string;
  value: ReactNode;
  loading?: boolean;
  footer?: ReactNode;
}) {
  return (
    <Card
      title={title}
      description={undefined}
      right={
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(255,107,0,0.10)] text-[var(--rs-orange)] ring-1 ring-[rgba(255,107,0,0.22)]">
          {icon}
        </div>
      }
    >
      <div className="mt-1">
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight text-white">{value}</div>
        )}
      </div>
      {footer ? <div className="mt-3 text-xs text-[var(--rs-muted)]">{footer}</div> : null}
    </Card>
  );
}

