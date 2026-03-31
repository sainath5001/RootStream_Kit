import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { useStreamPayments, useUserPayments } from "@/hooks/useEnvio";
import { formatRbtc, shortAddr } from "@/services/format";

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const [mode, setMode] = useState<"user" | "stream">("user");
  const [streamId, setStreamId] = useState("1");

  const [{ data: userPayments, fetching: userFetching, error: userError }] = useUserPayments(addrLower);
  const [{ data: streamPayments, fetching: streamFetching, error: streamError }] = useStreamPayments(
    mode === "stream" ? streamId : undefined
  );

  const rows = useMemo(() => {
    if (mode === "user") return userPayments?.Payment ?? [];
    return streamPayments?.Payment ?? [];
  }, [mode, userPayments, streamPayments]);

  const fetching = mode === "user" ? userFetching : streamFetching;
  const error = mode === "user" ? userError : streamError;

  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <p className="text-sm text-zinc-600">Indexed payments from Envio GraphQL.</p>
      </div>

      <div className="mt-6">
        <Card
          title="Payments"
          description={mode === "user" ? "Payments you sent" : "Payments for a specific stream"}
          right={
            <div className="flex items-center gap-2 text-sm">
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

          {fetching ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error.message}</p>
          ) : rows.length === 0 ? (
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
                  {rows.map((p: any) => (
                    <tr key={p.id} className="border-b border-zinc-100">
                      <td className="py-3">{new Date(p.executedAt).toLocaleString()}</td>
                      <td className="py-3">{p.stream?.streamId ?? p.stream?.id ?? "-"}</td>
                      <td className="py-3">{shortAddr(p.recipient?.id)}</td>
                      <td className="py-3">{formatRbtc(BigInt(p.amount))}</td>
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

