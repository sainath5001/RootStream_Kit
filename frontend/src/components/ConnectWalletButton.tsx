import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { rootstockTestnet } from "@/services/chains";
import { Button } from "@/components/Button";
import { useEffect, useState } from "react";

export function ConnectWalletButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Avoid SSR/client mismatch from injected wallet state.
  if (!mounted) {
    return (
      <Button variant="secondary" disabled>
        Connect wallet
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending || connectors.length === 0}
      >
        Connect wallet
      </Button>
    );
  }

  const wrongChain = chainId !== rootstockTestnet.id;

  return (
    <div className="flex items-center gap-2">
      {wrongChain ? (
        <Button
          variant="secondary"
          onClick={() => switchChain({ chainId: rootstockTestnet.id })}
          disabled={isSwitching}
        >
          Switch to Rootstock Testnet
        </Button>
      ) : null}

      <div className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-zinc-200">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </div>
      <Button variant="secondary" onClick={() => disconnect()}>
        Disconnect
      </Button>
    </div>
  );
}

