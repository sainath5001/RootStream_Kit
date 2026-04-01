import type { ChainPaymentLog } from "@/services/fetchPaymentExecutedLogs";

export type UnifiedPaymentRow = {
  id: string;
  when: Date;
  streamId: string;
  recipient: string;
  amount: bigint;
  txHash: string;
};

function envioPaymentToUnified(p: {
  id: string;
  executedAt: string;
  amount: string;
  txHash: string;
  stream?: { streamId?: string; id?: string } | null;
  recipient?: { id?: string } | null;
}): UnifiedPaymentRow {
  return {
    id: p.id,
    when: new Date(p.executedAt),
    streamId: String(p.stream?.streamId ?? p.stream?.id ?? ""),
    recipient: p.recipient?.id ?? "",
    amount: BigInt(p.amount),
    txHash: p.txHash,
  };
}

/**
 * Merges Envio rows with RPC log rows. Same tx+logIndex dedupes; RPC row wins when both exist.
 */
export type EnvioPaymentRow = {
  id: string;
  executedAt: string;
  amount: string;
  txHash: string;
  stream?: { streamId?: string; id?: string } | null;
  recipient?: { id?: string } | null;
};

export function mergePaymentHistory(envioRows: EnvioPaymentRow[], chainLogs: ChainPaymentLog[]): UnifiedPaymentRow[] {
  const map = new Map<string, UnifiedPaymentRow>();

  for (const log of chainLogs) {
    const id = `${log.txHash}-${log.logIndex}`;
    map.set(id, {
      id,
      when: new Date(Number(log.timestamp) * 1000),
      streamId: log.streamId.toString(),
      recipient: log.recipient,
      amount: log.amount,
      txHash: log.txHash,
    });
  }

  for (const p of envioRows) {
    if (map.has(p.id)) continue;
    map.set(p.id, envioPaymentToUnified(p));
  }

  return Array.from(map.values()).sort((a, b) => b.when.getTime() - a.when.getTime());
}
