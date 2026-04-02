"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId } from "wagmi";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { IconMenu } from "@/components/ui/Icons";

export function Topbar({ onMenu }: { onMenu?: () => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--rs-border)] bg-[rgba(11,11,11,0.72)] backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <button
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] text-white ring-1 ring-[var(--rs-border)] hover:bg-[rgba(255,255,255,0.10)]"
            onClick={onMenu}
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 lg:hidden">
            <BrandLogo size="sm" withLink />
            <span className="text-sm font-semibold text-white">Rootstream_kit</span>
          </div>
          <div className="hidden text-xs text-[var(--rs-muted)] sm:block">
            {isConnected ? (
              <>
                Network: <span className="text-white">{chainId}</span> ·{" "}
                <span className="font-mono text-white">
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </span>
              </>
            ) : (
              "Connect your wallet to get started"
            )}
          </div>
        </div>
        <ConnectButton showBalance={false} />
      </div>
    </header>
  );
}

