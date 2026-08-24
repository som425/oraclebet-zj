import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { CONFIG } from "@/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 6): string {
  if (!address) return "";
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatBps(bps: number): string {
  return (bps / 100).toFixed(2) + "%";
}

export function formatAmount(amount: string): string {
  const num = Number(amount);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toLocaleString();
}

export function getExplorerUrl(hash: string): string {
  if (CONFIG.stellarNetwork === "testnet") {
    return `https://stellar.expert/explorer/testnet/tx/${hash}`;
  }
  return `https://stellar.expert/explorer/public/tx/${hash}`;
}

export function statusLabel(status: number): string {
  const labels = ["Open", "Closed", "Resolving", "Disputed", "Finalized"];
  return labels[status] ?? "Unknown";
}

export function statusColor(status: number): string {
  const colors = [
    "bg-green-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-red-500",
    "bg-purple-500",
  ];
  return colors[status] ?? "bg-gray-500";
}

export function resultLabel(result: number): string {
  return ["Pending", "YES", "NO"][result] ?? "Unknown";
}

export function timeRemaining(target: number): string {
  const now = Math.floor(Date.now() / 1000);
  if (now >= target) return "Ended";
  const diff = target - now;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600) / 60);
  return `${hours}h ${mins}m`;
}
