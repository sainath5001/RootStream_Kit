"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconClock, IconGrid, IconPlus, IconWallet } from "@/components/ui/Icons";

const items = [
  { href: "/", label: "Dashboard", icon: IconGrid },
  { href: "/create", label: "Create Stream", icon: IconPlus },
  { href: "/streams", label: "Streams", icon: IconGrid },
  { href: "/history", label: "History", icon: IconClock },
  { href: "/funds", label: "Funds", icon: IconWallet },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 flex-none border-r border-[var(--rs-border)] bg-[var(--rs-bg)] lg:block">
      <div className="flex h-full flex-col px-4 py-6">
        <div className="px-2">
          <div className="text-sm font-semibold tracking-tight text-white">Rootstream_kit</div>
          <div className="mt-1 text-xs text-[var(--rs-muted)]">Recurring payments dashboard</div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {items.map((it) => {
            const active = pathname === it.href;
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                className={[
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                  active
                    ? "bg-[rgba(255,107,0,0.12)] text-white ring-1 ring-[rgba(255,107,0,0.25)]"
                    : "text-[var(--rs-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2 text-xs text-[var(--rs-muted)]">
          <div className="h-px w-full bg-[var(--rs-border)]" />
          <div className="mt-4">Rootstock Testnet</div>
        </div>
      </div>
    </aside>
  );
}

