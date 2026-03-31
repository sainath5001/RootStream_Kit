import type { ReactNode } from "react";
import Link from "next/link";
import { ConnectWalletButton } from "@/components/ConnectWalletButton";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/75 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Rootstream
            </Link>
            <nav className="hidden items-center gap-4 text-sm text-zinc-600 sm:flex">
              <Link className="hover:text-zinc-950" href="/">
                Dashboard
              </Link>
              <Link className="hover:text-zinc-950" href="/create">
                Create Stream
              </Link>
              <Link className="hover:text-zinc-950" href="/funds">
                Funds
              </Link>
              <Link className="hover:text-zinc-950" href="/history">
                History
              </Link>
            </nav>
          </div>
          <ConnectWalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

