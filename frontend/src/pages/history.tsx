import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { useStreamPayments, useUserPayments } from "@/hooks/useEnvio";
import { useChainPaymentLogs } from "@/hooks/useChainPaymentLogs";
import { mergePaymentHistory, type EnvioPaymentRow } from "@/services/mergePaymentHistory";
import { formatRbtc, shortAddr } from "@/services/format";
import { Button } from "@/components/Button";

function HistoryPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const [mode, setMode] = useState<"user" | "stream">("user");
  const [streamId, setStreamId] = useState("1");

  const [{ data: userPayments, fetching: userFetching, error: userError }, reexecUserPayments] =
    useUserPayments(addrLower);
  const [{ data: streamPayments, fetching: streamFetching, error: streamError }, reexecStreamPayments] =
    useStreamPayments(mode === "stream" ? streamId : undefined);

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
    if (mode === "user") return userPayments?.Payment ?? [];
    return streamPayments?.Payment ?? [];
  }, [mode, userPayments, streamPayments]);

  const mergedRows = useMemo(
    () => mergePaymentHistory(envioRows as EnvioPaymentRow[], chainFiltered),
    [envioRows, chainFiltered],
  );

  const envioFetching = mode === "user" ? userFetching : streamFetching;
  const envioError = mode === "user" ? userError : streamError;
  const loading = envioFetching || (isConnected && chainFetching);

  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-zinc-600">
          Merges Envio with an RPC scan of your <code className="text-xs">PaymentExecuted</code> logs. If the
          indexer stalls, recent payments still appear here. Very old payments outside the lookback window need
          Envio or a larger <code className="text-xs">NEXT_PUBLIC_PAYMENT_LOG_LOOKBACK_BLOCKS</code>.
        </p>
      </div>

      <div className="mt-6">
        <Card
          title="Payments"
          description={mode === "user" ? "Payments you sent" : "Payments for a specific stream"}
          right={
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Button
                variant="secondary"
                onClick={() => {
                  if (mode === "user") reexecUserPayments({ requestPolicy: "network-only" });
                  else reexecStreamPayments({ requestPolicy: "network-only" });
                  void refetchChainLogs();
                }}
              >
                Refresh
              </Button>
              <button
                className={[
                  "rounded-lg px-3 py-1.5 ring-1",
                  mode === "user" ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white ring-zinc-200",
                ].join(" ")}
                onClick={() => setMode("user")}
              >
                By user
              </button>
              <button
                className={[
                  "rounded-lg px-3 py-1.5 ring-1",
                  mode === "stream" ? "bg-zinc-900 text-white ring-zinc-900" : "bg-white ring-zinc-200",
                ].join(" ")}
                onClick={() => setMode("stream")}
              >
                By stream
              </button>
            </div>
          }
        >
          {mode === "user" && !isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet to see your payments.</p>
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
            <p className="mb-2 text-sm text-amber-800">
              Envio query issue (RPC table may still show rows): {envioError.message}
            </p>
          ) : null}

          {loading ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : mergedRows.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No payments found{mode === "user" && addrLower ? ` for ${shortAddr(addrLower)}` : ""}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="py-2">When</th>
                    <th className="py-2">Stream</th>
                    <th className="py-2">Recipient</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {mergedRows.map((p) => (
                    <tr key={p.id} className="border-b border-zinc-100">
                      <td className="py-3">{p.when.toLocaleString()}</td>
                      <td className="py-3">{p.streamId || "-"}</td>
                      <td className="py-3">{shortAddr(p.recipient)}</td>
                      <td className="py-3">{formatRbtc(p.amount)}</td>
                      <td className="py-3 font-mono text-xs">{shortAddr(p.txHash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default dynamic(() => Promise.resolve(HistoryPage), { ssr: false });
