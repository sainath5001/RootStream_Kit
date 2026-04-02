"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "animate-pulse rounded-xl bg-[rgba(255,255,255,0.06)] ring-1 ring-[rgba(255,255,255,0.06)]",
        className,
      ].join(" ")}
    />
  );
}

