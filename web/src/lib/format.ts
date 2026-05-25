import type { Address } from "viem";

export function shortAddress(addr: Address | string | undefined): string {
  if (!addr || addr === "0x0000000000000000000000000000000000000000") return "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function formatChip(amount: bigint): string {
  const n = Number(amount) / 1e18;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function formatCountdown(deadlineSec: number, nowSec: number): string {
  const left = Math.max(0, deadlineSec - nowSec);
  const m = Math.floor(left / 60);
  const s = left % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
