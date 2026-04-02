"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { IconClock, IconGrid, IconPlus, IconWallet } from "@/components/ui/Icons";
import { motion, AnimatePresence } from "framer-motion";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--rs-bg)] text-[var(--rs-text)]">
      <div className="flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <Topbar onMenu={() => setMobileOpen(true)} />
          <main className="px-4 py-8 lg:px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-[var(--rs-border)] bg-[var(--rs-bg)]">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="text-sm font-semibold text-white">Rootstream_kit</div>
              <button
                className="rounded-xl bg-[rgba(255,255,255,0.06)] px-3 py-2 text-xs text-white ring-1 ring-[var(--rs-border)]"
                onClick={() => setMobileOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="px-4">
              {/* mobile nav */}
              <SidebarMobile onNavigate={() => setMobileOpen(false)} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarMobile({ onNavigate }: { onNavigate: () => void }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Dashboard", icon: IconGrid },
    { href: "/create", label: "Create Stream", icon: IconPlus },
    { href: "/streams", label: "Streams", icon: IconGrid },
    { href: "/history", label: "History", icon: IconClock },
    { href: "/funds", label: "Funds", icon: IconWallet },
  ] as const;
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active = pathname === it.href;
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
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
  );
}

