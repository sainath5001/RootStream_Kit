"use client";

import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/Field";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useChainPaymentLogs } from "@/hooks/useChainPaymentLogs";
import { mergePaymentHistory, type EnvioPaymentRow } from "@/services/mergePaymentHistory";
import { formatRbtc, shortAddr } from "@/services/format";
import { useStreamPaymentsApollo, useUserPaymentsApollo } from "@/hooks/useEnvioApollo";

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const [mode, setMode] = useState<"user" | "stream">("user");
  const [streamId, setStreamId] = useState("1");

  const userPayments = useUserPaymentsApollo(addrLower);
  const streamPayments = useStreamPaymentsApollo(mode === "stream" ? streamId : undefined);

  const { data: chainLogs = [], refetch: refetchChainLogs, isFetching: chainFetching } = useChainPaymentLogs();

  const chainFiltered = useMemo(() => {
    if (mode !== "stream") return chainLogs;
    try {
      const sid = BigInt(streamId);
      return chainLogs.filter((l) => l.streamId === sid);
    } catch {
      return [];
    }
  }, [mode, streamId, chainLogs]);

  const envioRows = useMemo(() => {
    if (mode === "user") return (userPayments.data?.Payment ?? []) as EnvioPaymentRow[];
    return (streamPayments.data?.Payment ?? []) as EnvioPaymentRow[];
  }, [mode, userPayments.data, streamPayments.data]);

  const merged = useMemo(() => mergePaymentHistory(envioRows, chainFiltered), [envioRows, chainFiltered]);

  const envioLoading = mode === "user" ? userPayments.loading : streamPayments.loading;
  const envioError = mode === "user" ? userPayments.error : streamPayments.error;
  const loading = (isConnected && chainFetching) || envioLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">History</h1>
        <p className="text-sm text-[var(--rs-muted)]">
          Merges Envio with an RPC scan of your <code className="text-xs">PaymentExecuted</code> logs.
        </p>
      </div>

      <Card
        title="Payments"
        description={mode === "user" ? "Payments you sent" : "Payments for a specific stream"}
        right={
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button
              variant="secondary"
              onClick={() => {
                if (mode === "user") void userPayments.refetch();
                else void streamPayments.refetch();
                void refetchChainLogs();
              }}
            >
              Refresh
            </Button>
            <button
              className={[
                "rounded-xl px-3 py-2 ring-1 transition",
                mode === "user"
                  ? "bg-[rgba(255,107,0,0.12)] text-white ring-[rgba(255,107,0,0.25)]"
                  : "bg-[rgba(255,255,255,0.06)] text-[var(--rs-muted)] ring-[var(--rs-border)] hover:text-white",
              ].join(" ")}
              onClick={() => setMode("user")}
            >
              By user
            </button>
            <button
              className={[
                "rounded-xl px-3 py-2 ring-1 transition",
                mode === "stream"
                  ? "bg-[rgba(255,107,0,0.12)] text-white ring-[rgba(255,107,0,0.25)]"
                  : "bg-[rgba(255,255,255,0.06)] text-[var(--rs-muted)] ring-[var(--rs-border)] hover:text-white",
              ].join(" ")}
              onClick={() => setMode("stream")}
            >
              By stream
            </button>
          </div>
        }
      >
        {mode === "user" && !isConnected ? (
          <p className="text-sm text-[var(--rs-muted)]">Connect your wallet to see your payments.</p>
        ) : null}

        {mode === "stream" ? (
          <div className="mb-4 max-w-xs">
            <Field
              label="Stream ID"
              inputMode="numeric"
              value={streamId}
              onChange={(e) => setStreamId(e.target.value)}
              hint="Example: 1"
            />
          </div>
        ) : null}

        {envioError ? (
          <p className="mb-2 text-sm text-amber-300">Envio: {envioError.message}</p>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : merged.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description={
              mode === "stream"
                ? "No PaymentExecuted events found for this stream in the RPC lookback window."
                : "Execute a stream manually (or via automation) to generate payment history."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[rgba(11,11,11,0.9)] text-xs text-[var(--rs-muted)]">
                <tr className="border-b border-[var(--rs-border)]">
                  <th className="py-3">When</th>
                  <th className="py-3">Stream</th>
                  <th className="py-3">Recipient</th>
                  <th className="py-3">Amount</th>
                  <th className="py-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {merged.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-[rgba(255,255,255,0.06)] transition hover:bg-[rgba(255,255,255,0.03)]"
                  >
                    <td className="py-3 text-white">{p.when.toLocaleString()}</td>
                    <td className="py-3 text-white">{p.streamId || "-"}</td>
                    <td className="py-3 text-white">{shortAddr(p.recipient)}</td>
                    <td className="py-3 text-white">{formatRbtc(p.amount)}</td>
                    <td className="py-3 font-mono text-xs text-white">{shortAddr(p.txHash)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

