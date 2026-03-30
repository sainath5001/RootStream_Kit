import { Web3Function, Web3FunctionContext } from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "@ethersproject/contracts";
import { isAddress } from "@ethersproject/address";
import { BigNumber } from "@ethersproject/bignumber";
import { id } from "@ethersproject/hash";

const ROOTSTREAM_ABI = [
  "function streams(uint256) view returns (address sender, address recipient, uint256 amountPerInterval, uint256 interval, uint256 lastExecuted, bool active)",
  "function balances(address) view returns (uint256)",
  "function nextStreamId() view returns (uint256)",
  "function executePayment(uint256 streamId)",
  "event StreamCreated(uint256 indexed streamId, address indexed sender, address indexed recipient, uint256 amountPerInterval, uint256 interval, uint256 lastExecuted)",
];

const STREAM_CREATED_TOPIC = id(
  "StreamCreated(uint256,address,address,uint256,uint256,uint256)"
);

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") return parseInt(v, 10);
  return fallback;
}

function isMethodNotFound(err: any, method: string): boolean {
  const msg = String(err?.message ?? "");
  const code =
    err?.error?.code ??
    err?.serverError?.code ??
    err?.code ??
    err?.body?.error?.code;

  if (code === -32601) return true;
  if (msg.includes(`method ${method}`) && msg.includes("does not exist")) return true;
  if (msg.includes(method) && msg.includes("-32601")) return true;
  return false;
}

function isTemporaryRpcError(err: any): boolean {
  const msg = String(err?.message ?? "");
  const code = err?.error?.code ?? err?.serverError?.code ?? err?.code;
  return code === -32603 || msg.toLowerCase().includes("temporary internal error");
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider, gelatoArgs } = context;
  const chainId = gelatoArgs.chainId;

  const rootstreamAddr = String(userArgs.rootstream ?? "").trim();
  if (!isAddress(rootstreamAddr)) {
    return { canExec: false, message: "Invalid rootstream address" };
  }

  const fromBlock = Math.max(0, num(userArgs.fromBlock, 0));
  const logChunkSize = Math.max(100, num(userArgs.logChunkSize, 2000));
  const maxGetLogsChunks = Math.max(1, num(userArgs.maxGetLogsChunks, 40));
  const maxStreamIdsToCheck = Math.max(1, num(userArgs.maxStreamIdsToCheck, 150));
  const maxExecutionsPerRun = Math.max(1, num(userArgs.maxExecutionsPerRun, 8));
  const scanBatchSize = Math.max(1, num(userArgs.scanBatchSize, 150));
  const startStreamId = Math.max(1, num(userArgs.startStreamId, 1));
  const preferScan = Boolean(userArgs.preferScan);

  const provider = multiChainProvider.chainId(chainId);
  const c = new Contract(rootstreamAddr, ROOTSTREAM_ABI, provider);

  // Discover candidate stream IDs.
  // Preferred method: StreamCreated logs (efficient, avoids scanning empty mapping slots).
  // Fallback method: incremental scan over streamId range using a persistent cursor (works on RPCs without eth_getLogs).
  const ids: BigNumber[] = [];
  try {
    if (preferScan) throw new Error("preferScan");
    const latest = await provider.getBlockNumber();
    if (latest < fromBlock) {
      return { canExec: false, message: "Chain not synced past fromBlock" };
    }

    const streamIds = new Set<string>();
    let cursor = fromBlock;
    let chunks = 0;
    while (cursor <= latest && chunks < maxGetLogsChunks) {
      const to = Math.min(cursor + logChunkSize - 1, latest);
      let logs: any[] | undefined;
      let attempt = 0;
      while (attempt < 2) {
        try {
          logs = await provider.getLogs({
            address: rootstreamAddr,
            topics: [STREAM_CREATED_TOPIC],
            fromBlock: cursor,
            toBlock: to,
          });
          break;
        } catch (e: any) {
          attempt++;
          if (isMethodNotFound(e, "eth_getLogs")) throw e;
          if (!isTemporaryRpcError(e) || attempt >= 2) throw e;
          await sleep(250 * attempt);
        }
      }
      if (!logs) throw new Error("getLogsFailed");
      for (const log of logs) {
        if (log.topics.length > 1) {
          streamIds.add(BigNumber.from(log.topics[1]).toString());
        }
      }
      cursor = to + 1;
      chunks++;
    }

    if (cursor <= latest) {
      return {
        canExec: false,
        message: `Log scan incomplete (blocks ${cursor}-${latest} left); raise maxGetLogsChunks or logChunkSize`,
      };
    }

    ids.push(
      ...Array.from(streamIds)
        .map((s) => BigNumber.from(s))
        .sort((a, b) => (a.lt(b) ? -1 : a.gt(b) ? 1 : 0))
        .slice(0, maxStreamIdsToCheck)
    );
  } catch (err: any) {
    // Fall back to scanning when:
    // - RPC does not support eth_getLogs (-32601)
    // - RPC is flaky under load (-32603 Temporary internal error)
    // - User forces scan mode (preferScan)
    const allowFallback =
      String(err?.message ?? "") === "preferScan" ||
      isMethodNotFound(err, "eth_getLogs") ||
      isTemporaryRpcError(err);
    if (!allowFallback) throw err;

    const next = BigNumber.from(await c.nextStreamId());
    const maxId = next.sub(1);
    if (maxId.lt(1)) {
      return { canExec: false, message: "No streams created yet" };
    }

    const storageKey = `scanCursor:${rootstreamAddr.toLowerCase()}:${chainId}`;
    const stored = await context.storage.get(storageKey);
    let scanCursor = BigNumber.from(stored && stored !== "" ? stored : startStreamId);
    if (scanCursor.lt(1) || scanCursor.gt(maxId)) scanCursor = BigNumber.from(startStreamId);

    const end = BigNumber.from(scanBatchSize);
    let checked = 0;
    while (checked < end.toNumber() && ids.length < maxStreamIdsToCheck) {
      ids.push(scanCursor);
      checked++;
      scanCursor = scanCursor.add(1);
      if (scanCursor.gt(maxId)) scanCursor = BigNumber.from(1);
    }

    await context.storage.set(storageKey, scanCursor.toString());
  }

  if (ids.length === 0) {
    return { canExec: false, message: "No candidate streams found" };
  }

  // `eth_getBlockByNumber` must be supported by the RPC for timestamp-based due checks.
  // (On Rootstock testnet, some free RPCs selectively disable `eth_getLogs`, but should still support blocks.)
  const block = await provider.getBlock("latest");
  const nowBn = BigNumber.from(block.timestamp);

  type Due = { streamId: BigNumber };
  const due: Due[] = [];

  for (const streamId of ids) {
    let sender: string;
    let amountPerInterval: BigNumber;
    let interval: BigNumber;
    let lastExecuted: BigNumber;
    let active: boolean;
    try {
      const row = await c.streams(streamId);
      sender = row.sender;
      amountPerInterval = row.amountPerInterval;
      interval = row.interval;
      lastExecuted = row.lastExecuted;
      active = row.active;
    } catch {
      continue;
    }

    if (!active || sender === "0x0000000000000000000000000000000000000000") continue;
    if (amountPerInterval.isZero() || interval.isZero()) continue;

    const nextDue = lastExecuted.add(interval);
    if (nowBn.lt(nextDue)) continue;

    const bal: BigNumber = await c.balances(sender);
    if (bal.lt(amountPerInterval)) continue;

    due.push({ streamId });
  }

  due.sort((a, b) => (a.streamId.lt(b.streamId) ? -1 : a.streamId.gt(b.streamId) ? 1 : 0));
  const batch = due.slice(0, maxExecutionsPerRun);

  if (batch.length === 0) {
    return {
      canExec: false,
      message: `No due streams (candidates ${ids.length}, chain ${chainId})`,
    };
  }

  const callData = batch.map(({ streamId }) => ({
    to: rootstreamAddr,
    data: c.interface.encodeFunctionData("executePayment", [streamId]),
  }));

  return { canExec: true, callData };
});
