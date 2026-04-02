"use client";

import toast from "react-hot-toast";
import { useEffect, useMemo, useRef } from "react";
import { parseEther } from "viem";
import { Button } from "@/components/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/dashboard/StatCard";
import { IconClock, IconGrid, IconWallet } from "@/components/ui/Icons";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { useAnalyticsApollo, useUserStreamsApollo } from "@/hooks/useEnvioApollo";
import { useUserStreamsOnChain } from "@/hooks/useUserStreamsOnChain";
import { useChainPaymentLogs } from "@/hooks/useChainPaymentLogs";
import { useActiveStreamCount, useBalance, useRootstreamContract, useRootstreamWrite } from "@/hooks/useRootstream";
import { formatRbtc, secondsToHuman, shortAddr } from "@/services/format";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const analytics = useAnalyticsApollo();
  const envioStreams = useUserStreamsApollo(addrLower);

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
          "Transaction reverted. For Execute: wait until interval passes and keep enough prepaid balance.",
          { id: "tx", duration: 8000 },
        );
        balance.refetch();
        activeCount.refetch();
        void refetchChainStreams();
        void refetchChainPayLogs();
        return;
      }
      toast.success("Transaction confirmed", { id: "tx" });
      void refetchChainStreams();
      void refetchChainPayLogs();
      balance.refetch();
      activeCount.refetch();
      void analytics.refetch();
      void envioStreams.refetch();
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
    receipt.data,
    analytics,
    envioStreams,
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
      write.writeContract({ address: contractAddress, abi, functionName: "cancelStream", args: [streamId] });
      toast.loading("Cancel submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Cancel failed");
    }
  }

  async function executePayment(streamId: bigint) {
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({ address: contractAddress, abi, functionName: "executePayment", args: [streamId] });
      toast.loading("Execute submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Execute failed");
    }
  }

  const streams = chainStreams;
  const activeOnChain = streams.filter((s) => s.active);

  const envioByStreamId = new Map<string, any>();
  for (const s of envioStreams.data?.Stream ?? []) envioByStreamId.set(String(s.streamId), s);

  const totalPaid = analytics.data?.Analytics_by_pk?.totalPaid;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <p className="text-sm text-[var(--rs-muted)]">
            Streams/balances are live RPC. Analytics/Envio fields can lag; Paid merges Envio + RPC logs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void analytics.refetch();
              void envioStreams.refetch();
              void refetchChainStreams();
              void refetchChainPayLogs();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <StatCard
          icon={<IconGrid className="h-5 w-5" />}
          title="Total Streams"
          loading={analytics.loading}
          value={analytics.data?.Analytics_by_pk?.totalStreams ?? "—"}
          footer="Envio indexed total"
        />
        <StatCard
          icon={<IconClock className="h-5 w-5" />}
          title="Active Streams"
          loading={analytics.loading}
          value={analytics.data?.Analytics_by_pk?.activeStreams ?? "—"}
          footer="Envio indexed active"
        />
        <StatCard
          icon={<IconWallet className="h-5 w-5" />}
          title="Total Paid"
          loading={analytics.loading}
          value={totalPaid == null ? "—" : formatRbtc(BigInt(totalPaid))}
          footer="Envio indexed paid"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card title="Your funds" description="Onchain prepaid balance (contract)">
          {!isConnected ? (
            <p className="text-sm text-[var(--rs-muted)]">Connect your wallet.</p>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-[var(--rs-muted)]">Balance</div>
                <div className="text-lg font-semibold text-white">
                  {balance.isLoading ? "…" : formatRbtc((balance.data as bigint | undefined) ?? 0n)}
                </div>
                <div className="mt-1 text-xs text-[var(--rs-muted)]">
                  Active streams: {activeCount.isLoading ? "…" : String((activeCount.data as bigint | undefined) ?? 0n)}
                </div>
              </div>
              <Button onClick={depositDemo} disabled={!address || write.isPending}>
                Deposit 0.0001
              </Button>
            </div>
          )}
        </Card>

        <Card title="Your streams" description="Contract (immediate)">
          {!isConnected ? (
            <p className="text-sm text-[var(--rs-muted)]">Connect your wallet.</p>
          ) : chainStreamsLoading ? (
            <p className="text-sm text-[var(--rs-muted)]">Loading…</p>
          ) : (
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--rs-muted)]">Active</span>
                <span className="font-semibold text-white">{activeOnChain.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[var(--rs-muted)]">Total</span>
                <span className="font-semibold text-white">{streams.length}</span>
              </div>
            </div>
          )}
        </Card>

        <Card title="Address" description="Connected wallet">
          <div className="text-sm font-mono text-white">{isConnected ? shortAddr(address) : "—"}</div>
        </Card>
      </div>

      <Card
        title="Manage streams"
        description="Live from contract · Paid merges Envio + RPC logs (lookback window)"
      >
        {!isConnected ? (
          <p className="text-sm text-[var(--rs-muted)]">Connect your wallet.</p>
        ) : chainStreamsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : streams.length === 0 ? (
          <EmptyState
            title="No streams created yet"
            description="Create your first stream to start recurring payments."
            action={
              <a
                href="/create"
                className="inline-flex rounded-xl bg-[var(--rs-orange)] px-4 py-2 text-sm font-semibold text-black rs-glow"
              >
                Create Stream
              </a>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[rgba(11,11,11,0.9)] text-xs text-[var(--rs-muted)]">
                <tr className="border-b border-[var(--rs-border)]">
                  <th className="py-3">ID</th>
                  <th className="py-3">Recipient</th>
                  <th className="py-3">Amount/interval</th>
                  <th className="py-3">Interval</th>
                  <th className="py-3">Active</th>
                  <th className="py-3">Paid</th>
                  <th className="py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {streams.map((s) => {
                  const idKey = s.streamId.toString();
                  const envio = envioByStreamId.get(idKey);
                  const envioPaid = envio?.totalPaid != null ? BigInt(envio.totalPaid as string) : 0n;
                  const rpcPaid = chainPaidByStream.get(idKey) ?? 0n;
                  const paid = rpcPaid > envioPaid ? rpcPaid : envioPaid;
                  return (
                    <tr
                      key={idKey}
                      className="border-b border-[rgba(255,255,255,0.06)] transition hover:bg-[rgba(255,255,255,0.03)]"
                    >
                      <td className="py-3 font-medium text-white">{idKey}</td>
                      <td className="py-3 text-white">{shortAddr(s.recipient)}</td>
                      <td className="py-3 text-white">{formatRbtc(s.amountPerInterval)}</td>
                      <td className="py-3 text-white">{secondsToHuman(s.interval)}</td>
                      <td className="py-3 text-white">{s.active ? "Active" : "Cancelled"}</td>
                      <td className="py-3 text-white">{paid > 0n ? formatRbtc(paid) : "—"}</td>
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
  );
}

