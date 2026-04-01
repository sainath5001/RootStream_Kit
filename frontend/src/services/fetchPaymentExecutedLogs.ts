import { type Address, type PublicClient, parseAbiItem } from "viem";

const paymentExecutedEvent = parseAbiItem(
  "event PaymentExecuted(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 amount, uint256 timestamp)",
);

export type ChainPaymentLog = {
  streamId: bigint;
  sender: Address;
  recipient: Address;
  amount: bigint;
  timestamp: bigint;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
};

const DEFAULT_CHUNK = 2000n;

/**
 * Chunked eth_getLogs for RPCs that cap block range (e.g. 2000 on many providers).
 */
export async function fetchPaymentExecutedLogsChunked(
  client: PublicClient,
  params: {
    contract: Address;
    sender: Address;
    fromBlock: bigint;
    toBlock: bigint;
    chunkSize?: bigint;
  },
): Promise<ChainPaymentLog[]> {
  const chunkSize = params.chunkSize ?? DEFAULT_CHUNK;
  const out: ChainPaymentLog[] = [];
  let from = params.fromBlock;

  while (from <= params.toBlock) {
    const to = from + chunkSize - 1n > params.toBlock ? params.toBlock : from + chunkSize - 1n;
    const logs = await client.getLogs({
      address: params.contract,
      event: paymentExecutedEvent,
      args: { sender: params.sender },
      fromBlock: from,
      toBlock: to,
    });

    for (const log of logs) {
      if (!log.args) continue;
      const { streamId, sender, recipient, amount, timestamp } = log.args;
      out.push({
        streamId: streamId as bigint,
        sender: sender as Address,
        recipient: recipient as Address,
        amount: amount as bigint,
        timestamp: timestamp as bigint,
        txHash: log.transactionHash,
        logIndex: log.logIndex,
        blockNumber: log.blockNumber,
      });
    }
    from = to + 1n;
  }

  return out.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
    return b.logIndex - a.logIndex;
  });
}
