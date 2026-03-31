import dynamic from "next/dynamic";

import toast from "react-hot-toast";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, type Address } from "viem";
import { useAnalytics, useUserStreams } from "@/hooks/useEnvio";
import { useActiveStreamCount, useBalance, useRootstreamContract, useRootstreamWrite } from "@/hooks/useRootstream";
import { formatRbtc, secondsToHuman, shortAddr } from "@/services/format";

function DashboardPage() {
  const { address, isConnected } = useAccount();
  const addrLower = address?.toLowerCase();

  const [{ data: analyticsData, fetching: analyticsFetching, error: analyticsError }] = useAnalytics();
  const [{ data: streamsData, fetching: streamsFetching, error: streamsError }, reexecStreams] =
    useUserStreams(addrLower);

  const balance = useBalance();
  const activeCount = useActiveStreamCount();

  const { address: contractAddress, abi } = useRootstreamContract();
  const write = useRootstreamWrite();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  async function depositDemo() {
    if (!address) return;
    try {
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

  if (receipt.isSuccess) {
    toast.success("Transaction confirmed", { id: "tx" });
    // Refresh indexer-driven data and onchain reads
    reexecStreams({ requestPolicy: "network-only" });
    balance.refetch();
    activeCount.refetch();
  } else if (receipt.isError) {
    toast.error("Transaction failed", { id: "tx" });
  }

  const streams = streamsData?.Stream ?? [];
  const activeStreams = streams.filter((s: any) => s.active);

  const analytics = analyticsData?.Analytics_by_pk;

  return (
    <Layout>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Wallet actions write to the contract, history comes from Envio GraphQL.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => reexecStreams({ requestPolicy: "network-only" })}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card
          title="Analytics"
          description="Indexed global totals"
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

        <Card title="Your streams" description="Indexed streams where you are the sender">
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet to view your streams.</p>
          ) : streamsFetching ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : streamsError ? (
            <p className="text-sm text-red-600">{streamsError.message}</p>
          ) : (
            <div className="text-sm">
              <div className="flex items-center justify-between">
                <span className="text-zinc-600">Active</span>
                <span className="font-semibold">{activeStreams.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-zinc-600">Total</span>
                <span className="font-semibold">{streams.length}</span>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Manage streams" description="Cancel or execute manually (fallback)">
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet.</p>
          ) : streamsFetching ? (
            <p className="text-sm text-zinc-600">Loading…</p>
          ) : streams.length === 0 ? (
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
                  {streams.map((s: any) => {
                    const idBn = BigInt(s.streamId);
                    const recipient = s.recipient?.id as Address | undefined;
                    return (
                      <tr key={s.id} className="border-b border-zinc-100">
                        <td className="py-3 font-medium">{s.streamId}</td>
                        <td className="py-3">{shortAddr(recipient)}</td>
                        <td className="py-3">{formatRbtc(BigInt(s.amountPerInterval))}</td>
                        <td className="py-3">{secondsToHuman(BigInt(s.interval))}</td>
                        <td className="py-3">{s.active ? "Yes" : "No"}</td>
                        <td className="py-3">{formatRbtc(BigInt(s.totalPaid ?? "0"))}</td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              onClick={() => executePayment(idBn)}
                              disabled={write.isPending || !s.active}
                            >
                              Execute
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => cancelStream(idBn)}
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

