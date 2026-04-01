import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import type { Address } from "viem";
import { useRootstreamContract } from "@/hooks/useRootstream";

export type OnChainStreamRow = {
  streamId: bigint;
  sender: Address;
  recipient: Address;
  amountPerInterval: bigint;
  interval: bigint;
  lastExecuted: bigint;
  active: boolean;
};

export function useUserStreamsOnChain() {
  const { address } = useAccount();
  const c = useRootstreamContract();

  const idsQuery = useReadContract({
    ...c,
    functionName: "getUserStreams",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const ids = (idsQuery.data as bigint[] | undefined) ?? [];

  const detailsQuery = useReadContracts({
    contracts: ids.map((id) => ({
      address: c.address,
      abi: c.abi,
      functionName: "streams" as const,
      args: [id],
    })),
    query: { enabled: Boolean(address) && ids.length > 0 },
  });

  const streams = useMemo((): OnChainStreamRow[] => {
    if (!detailsQuery.data || ids.length === 0) return [];
    const out: OnChainStreamRow[] = [];
    for (let i = 0; i < ids.length; i++) {
      const res = detailsQuery.data[i]?.result;
      if (!res) continue;
      const [sender, recipient, amountPerInterval, interval, lastExecuted, active] = res as readonly [
        Address,
        Address,
        bigint,
        bigint,
        bigint,
        boolean,
      ];
      out.push({
        streamId: ids[i]!,
        sender,
        recipient,
        amountPerInterval,
        interval,
        lastExecuted,
        active,
      });
    }
    return out;
  }, [ids, detailsQuery.data]);

  const isLoading =
    idsQuery.isLoading || (ids.length > 0 && (detailsQuery.isLoading || detailsQuery.isPending));

  return {
    streams,
    isLoading,
    refetch: async () => {
      await idsQuery.refetch();
      await detailsQuery.refetch();
    },
  };
}
