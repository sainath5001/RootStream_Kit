import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Layout } from "@/components/Layout";
import { useActiveStreamCount, useBalance, useRootstreamContract, useRootstreamWrite } from "@/hooks/useRootstream";
import { formatRbtc } from "@/services/format";

export default function FundsPage() {
  const { isConnected } = useAccount();
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
        toast.error("Transaction reverted (e.g. withdraw needs all streams cancelled first).", {
          id: "tx",
          duration: 7000,
        });
        balance.refetch();
        activeCount.refetch();
        return;
      }
      toast.success("Transaction confirmed", { id: "tx" });
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
    receipt.data,
    balance,
    activeCount,
  ]);

  const [depositAmount, setDepositAmount] = useState("0.0001");
  const [withdrawStreamId, setWithdrawStreamId] = useState("1");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const amt = Number(depositAmount);
    if (!depositAmount) e.depositAmount = "Required";
    else if (!Number.isFinite(amt) || amt <= 0) e.depositAmount = "Must be > 0";

    const sid = Number(withdrawStreamId);
    if (!withdrawStreamId) e.withdrawStreamId = "Required";
    else if (!Number.isFinite(sid) || sid <= 0) e.withdrawStreamId = "Must be > 0";

    return e;
  }, [depositAmount, withdrawStreamId]);

  async function deposit() {
    if (!isConnected) return toast.error("Connect your wallet first");
    if (errors.depositAmount) return toast.error("Fix deposit amount");
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "depositFunds",
        value: parseEther(depositAmount),
      });
      toast.loading("Deposit submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Deposit failed");
    }
  }

  async function withdraw() {
    if (!isConnected) return toast.error("Connect your wallet first");
    if (errors.withdrawStreamId) return toast.error("Fix stream id");
    try {
      txNotifiedRef.current = undefined;
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "withdrawRemainingBalance",
        args: [BigInt(withdrawStreamId)],
      });
      toast.loading("Withdraw submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Withdraw failed");
    }
  }

  const bal = (balance.data as bigint | undefined) ?? 0n;
  const active = (activeCount.data as bigint | undefined) ?? 0n;

  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Funds</h1>
        <p className="text-sm text-zinc-600">
          Deposit RBTC into Rootstream (prepaid model). Withdraw is only allowed after cancelling all
          streams.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Your onchain balance" description="Rootstream.balances(msg.sender)">
          {!isConnected ? (
            <p className="text-sm text-zinc-600">Connect your wallet to view and manage funds.</p>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <div className="rounded-lg bg-zinc-50 p-3 ring-1 ring-zinc-100">
                <div className="text-zinc-600">Prepaid balance</div>
                <div className="text-lg font-semibold">
                  {balance.isLoading ? "Loading…" : formatRbtc(bal)}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Active streams: {activeCount.isLoading ? "…" : String(active)}
                </div>
                {bal === 0n && active > 0n ? (
                  <p className="mt-2 text-xs text-amber-800">
                    Balance 0 with active streams usually means payouts already used your prepaid RBTC — deposit
                    again before Execute, or Execute will revert.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </Card>

        <Card title="Deposit" description="Adds funds to your prepaid balance">
          <div className="grid gap-4">
            <Field
              label="Amount (RBTC)"
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              error={errors.depositAmount}
            />
            <div className="flex justify-end">
              <Button onClick={deposit} disabled={write.isPending || !isConnected}>
                Deposit
              </Button>
            </div>
          </div>
        </Card>

        <Card
          title="Withdraw remaining balance"
          description="Requires: all your streams cancelled AND activeStreamCount == 0. Provide any cancelled streamId you own."
        >
          <div className="grid gap-4">
            <Field
              label="Cancelled streamId"
              inputMode="numeric"
              value={withdrawStreamId}
              onChange={(e) => setWithdrawStreamId(e.target.value)}
              error={errors.withdrawStreamId}
            />
            <div className="flex justify-end">
              <Button variant="secondary" onClick={withdraw} disabled={write.isPending || !isConnected}>
                Withdraw
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

