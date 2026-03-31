import { useMemo } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import type { Address } from "viem";
import { getPublicEnv } from "@/services/env";
import { ROOTSTREAM_ABI } from "@/services/rootstreamAbi";

export function useRootstreamContract() {
  const { rootstreamAddress } = getPublicEnv();
  const address = rootstreamAddress as Address;
  return useMemo(() => ({ address, abi: ROOTSTREAM_ABI }), [address]);
}

export function useBalance() {
  const { address } = useAccount();
  const c = useRootstreamContract();
  return useReadContract({
    ...c,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
}

export function useActiveStreamCount() {
  const { address } = useAccount();
  const c = useRootstreamContract();
  return useReadContract({
    ...c,
    functionName: "activeStreamCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });
}

export function useRootstreamWrite() {
  return useWriteContract();
}

