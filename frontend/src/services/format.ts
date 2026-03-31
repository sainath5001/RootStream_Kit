import { formatUnits } from "viem";

export function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatRbtc(wei?: bigint) {
  if (wei === undefined) return "";
  return formatUnits(wei, 18);
}

export function secondsToHuman(seconds: bigint | number) {
  const s = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!Number.isFinite(s) || s <= 0) return "-";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) return `${Math.round(s / 3600)}h`;
  return `${Math.round(s / 86400)}d`;
}

