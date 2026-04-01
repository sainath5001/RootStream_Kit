import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { getPublicEnv } from "@/services/env";
import { fetchPaymentExecutedLogsChunked, type ChainPaymentLog } from "@/services/fetchPaymentExecutedLogs";

/**
 * Reads PaymentExecuted logs from RPC (chunked). Use when Envio lags or stalls.
 * Scans [max(deployBlock, latest - lookback), latest].
 */
export function useChainPaymentLogs() {
  const { address } = useAccount();
  const client = usePublicClient();
  const { rootstreamAddress, rootstreamDeployBlock, paymentLogLookbackBlocks } = getPublicEnv();

  return useQuery({
    queryKey: ["chainPaymentExecuted", address, rootstreamAddress, rootstreamDeployBlock.toString(), paymentLogLookbackBlocks.toString()],
    enabled: Boolean(client && address && rootstreamAddress),
    queryFn: async (): Promise<ChainPaymentLog[]> => {
      const latest = await client!.getBlockNumber();
      const lookbackStart = latest > paymentLogLookbackBlocks ? latest - paymentLogLookbackBlocks : 0n;
      const fromBlock = lookbackStart > rootstreamDeployBlock ? lookbackStart : rootstreamDeployBlock;

      return fetchPaymentExecutedLogsChunked(client!, {
        contract: rootstreamAddress as Address,
        sender: address as Address,
        fromBlock,
        toBlock: latest,
      });
    },
    staleTime: 15_000,
  });
}
