import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";

import toast from "react-hot-toast";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, type Address } from "viem";
import { useAnalytics, useUserStreams } from "@/hooks/useEnvio";
import { useUserStreamsOnChain } from "@/hooks/useUserStreamsOnChain";
import { useChainPaymentLogs } from "@/hooks/useChainPaymentLogs";
import { useActiveStreamCount, useBalance, useRootstreamContract, useRootstreamWrite } from "@/hooks/useRootstream";
import { formatRbtc, secondsToHuman, shortAddr } from "@/services/format";

function DashboardPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const [{ data: analyticsData, fetching: analyticsFetching, error: analyticsError }, reexecAnalytics] =
    useAnalytics();
  const [{ data: streamsData, fetching: streamsFetching, error: streamsError }, reexecStreams] =
    useUserStreams(addrLower);
  const { streams: chainStreams, isLoading: chainStreamsLoading, refetch: refetchChainStreams } =
    useUserStreamsOnChain();
  const { data: chainPayLogs = [], refetch: refetchChainPayLogs } = useChainPaymentLogs();

  const chainPaidByStream = useMemo(() => {
    const m = new Map<string, bigint>();
    for (const log of chainPayLogs) {
      const k = log.streamId.toString();
      m.set(k, (m.get(k) ?? 0n) + log.amount);
    }
    return m;
  }, [chainPayLogs]);

  const balance = useBalance();
  const activeCount = useActiveStreamCount();

  const { address: contractAddress, abi } = useRootstreamContract();
  const write = useRootstreamWrite();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });
  const txNotifiedRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const hash = write.data;
    if (!hash || receipt.isPending || receipt.isLoading) return;
    if (txNotifiedRef.current === hash) return;
    if (receipt.isSuccess && receipt.data) {
      txNotifiedRef.current = hash;
      if (receipt.data.status === "reverted") {
        toast.error(
          "Transaction reverted. For Execute: wait until the interval passes since last payment, and keep enough prepaid balance in Rootstream.",
          { id: "tx", duration: 8000 },
        );
        balance.refetch();
        activeCount.refetch();
        void refetchChainStreams();
        void refetchChainPayLogs();
        return;
      }
      toast.success("Transaction confirmed", { id: "tx" });
      reexecStreams({ requestPolicy: "network-only" });
      reexecAnalytics({ requestPolicy: "network-only" });
      void refetchChainStreams();
      void refetchChainPayLogs();
      balance.refetch();
      activeCount.refetch();
    } else if (receipt.isError) {
      txNotifiedRef.current = hash;
      toast.error("Transaction failed", { id: "tx" });
    }
  }, [
    write.data,
    receipt.isPending,
    receipt.isLoading,
    receipt.isSuccess,
    receipt.isError,
    reexecStreams,
    reexecAnalytics,
    refetchChainStreams,
    refetchChainPayLogs,
    balance,
    activeCount,
  ]);

  async function depositDemo() {
    if (!address) return;
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "depositFunds",
        value: parseEther("0.0001"),
      });
      toast.loading("Deposit submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Deposit failed");
    }
  }

  async function cancelStream(streamId: bigint) {
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "cancelStream",
        args: [streamId],
      });
      toast.loading("Cancel submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Cancel failed");
    }
  }

  async function executePayment(streamId: bigint) {
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "executePayment",
        args: [streamId],
      });
      toast.loading("Execute submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Execute failed");
    }
  }

  const envioStreams = streamsData?.Stream ?? [];
  const envioByStreamId = new Map<string, (typeof envioStreams)[0]>();
  for (const s of envioStreams) {
    envioByStreamId.set(String(s.streamId), s);
  }

  const manageStreams = chainStreams;
  const activeOnChain = manageStreams.filter((s) => s.active);

  const analytics = analyticsData?.Analytics_by_pk;

  return (
    <Layout>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Streams and balances use live RPC. Analytics is Envio-only (can lag). History and the Paid column
            merge Envio with recent <code className="text-xs">PaymentExecuted</code> logs from RPC (see{" "}
            <code className="text-xs">NEXT_PUBLIC_PAYMENT_LOG_LOOKBACK_BLOCKS</code> in .env.example).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              reexecStreams({ requestPolicy: "network-only" });
              reexecAnalytics({ requestPolicy: "network-only" });
              void refetchChainStreams();
              void refetchChainPayLogs();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Analytics (Envio)"
          description="Global totals from indexed events only — not the same as live on-chain counts below."
          right={analyticsFetching ? <span className="text-xs text-zinc-500">Loading…</span> : null}
        >
          {analyticsError ? <p className="text-sm text-red-600">{analyticsError.message}</p> : null}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="text-zinc-600">Total paid</div>
              <div className="font-semibold">{analytics ? formatRbtc(BigInt(analytics.totalPaid)) : "-"}</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="text-zinc-600">Active streams</div>
              <div className="font-semibold">{analytics ? analytics.activeStreams : "-"}</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="text-zinc-600">Total streams</div>
              <div className="font-semibold">{analytics ? analytics.totalStreams : "-"}</div>
            </div>
            <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
              <div className="text-zinc-600">Total payments</div>
              <div className="font-semibold">{analytics ? analytics.totalPayments : "-"}</div>
            </div>
          </div>
        </Card>

        <Card title="Your funds" description="Onchain prepaid balance (Rootstream.balances)">
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet to see your balance.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-zinc-600">Balance</div>
                <div className="text-lg font-semibold">
                  {balance.isLoading ? "Loading…" : formatRbtc((balance.data as bigint | undefined) ?? 0n)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Active streams:{" "}
                  {activeCount.isLoading ? "…" : String((activeCount.data as bigint | undefined) ?? 0n)}
                </div>
              </div>
              <Button onClick={depositDemo} disabled={!address || write.isPending}>
                Deposit 0.0001
              </Button>
            </div>
          )}
        </Card>

        <Card
          title="Your streams"
          description="From contract (immediate). Envio may lag on “Paid” / analytics."
        >
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet to view your streams.</p>
          ) : chainStreamsLoading ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : (
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Active</span>
                <span className="font-semibold">{activeOnChain.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-600">Total</span>
                <span className="font-semibold">{manageStreams.length}</span>
              </div>
              {streamsError ? (
                <p className="mt-2 text-xs text-amber-700">Envio: {streamsError.message}</p>
              ) : streamsFetching ? (
                <p className="mt-2 text-xs text-zinc-500">Refreshing indexer…</p>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card
          title="Manage streams"
          description="Streams from contract. Paid = higher of Envio total vs sum of your PaymentExecuted logs in the RPC lookback window."
        >
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet.</p>
          ) : chainStreamsLoading ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : manageStreams.length === 0 ? (
            <p className="text-sm text-zinc-600">No streams found for {shortAddr(address)}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-zinc-500">
                  <tr className="border-b border-zinc-200">
                    <th className="py-2">ID</th>
                    <th className="py-2">Recipient</th>
                    <th className="py-2">Amount/interval</th>
                    <th className="py-2">Interval</th>
                    <th className="py-2">Active</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {manageStreams.map((s) => {
                    const idKey = s.streamId.toString();
                    const envio = envioByStreamId.get(idKey);
                    const envioPaid = envio?.totalPaid != null ? BigInt(envio.totalPaid as string) : 0n;
                    const rpcPaid = chainPaidByStream.get(idKey) ?? 0n;
                    const displayPaid = rpcPaid > envioPaid ? rpcPaid : envioPaid;
                    return (
                      <tr key={idKey} className="border-b border-zinc-100">
                        <td className="py-3 font-medium">{idKey}</td>
                        <td className="py-3">{shortAddr(s.recipient)}</td>
                        <td className="py-3">{formatRbtc(s.amountPerInterval)}</td>
                        <td className="py-3">{secondsToHuman(s.interval)}</td>
                        <td className="py-3">{s.active ? "Yes" : "No"}</td>
                        <td className="py-3">
                          {displayPaid > 0n ? formatRbtc(displayPaid) : <span className="text-zinc-400">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => executePayment(s.streamId)}
                              disabled={write.isPending || !s.active}
                            >
                              Execute
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => cancelStream(s.streamId)}
                              disabled={write.isPending || !s.active}
                            >
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}

export default dynamic(() => Promise.resolve(DashboardPage), { ssr: false });

