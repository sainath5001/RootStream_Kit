import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { isAddress, parseEther, type Address } from "viem";
import { useAccount, useWaitForTransactionReceipt } from "wagmi";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Field } from "@/components/Field";
import { Layout } from "@/components/Layout";
import { useRootstreamContract, useRootstreamWrite } from "@/hooks/useRootstream";

export default function CreateStreamPage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useRootstreamContract();
  const write = useRootstreamWrite();
  const receipt = useWaitForTransactionReceipt({ hash: write.data });

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.0001");
  const [interval, setInterval] = useState("60");

  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!recipient) e.recipient = "Recipient is required";
    else if (!isAddress(recipient)) e.recipient = "Invalid address";

    const amt = Number(amount);
    if (!amount) e.amount = "Amount is required";
    else if (!Number.isFinite(amt) || amt <= 0) e.amount = "Amount must be > 0";

    const intv = Number(interval);
    if (!interval) e.interval = "Interval is required";
    else if (!Number.isFinite(intv) || intv <= 0) e.interval = "Interval must be > 0";

    return e;
  }, [recipient, amount, interval]);

  async function submit() {
    if (!isConnected) return toast.error("Connect your wallet first");
    if (Object.keys(errors).length) return toast.error("Fix the form errors");

    try {
      write.writeContract({
        address: contractAddress,
        abi,
        functionName: "createStream",
        args: [recipient as Address, parseEther(amount), BigInt(interval)],
      });
      toast.loading("Create stream submitted…", { id: "tx" });
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.message ?? "Create stream failed");
    }
  }

  if (receipt.isSuccess) toast.success("Stream created", { id: "tx" });
  if (receipt.isError) toast.error("Transaction failed", { id: "tx" });

  return (
    <Layout>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Create Stream</h1>
        <p className="text-sm text-zinc-600">
          Creates a new recurring payment stream (prepaid model). Make sure you’ve deposited enough.
        </p>
      </div>

      <div className="mt-6 max-w-2xl">
        <Card title="Stream details" description="All amounts are RBTC (18 decimals)">
          <div className="grid gap-4">
            <Field
              label="Recipient address"
              placeholder="0x…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              error={errors.recipient}
              spellCheck={false}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Amount per interval (RBTC)"
                placeholder="0.0001"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                error={errors.amount}
              />
              <Field
                label="Interval (seconds)"
                placeholder="60"
                inputMode="numeric"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                error={errors.interval}
              />
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={submit} disabled={write.isPending}>
                Create stream
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

