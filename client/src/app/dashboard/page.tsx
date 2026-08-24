"use client";

import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/store";
import { Wallet, Coins, Trophy, Activity, ArrowRight } from "lucide-react";
import { shortenAddress, formatAmount } from "@/lib/utils";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { address, balance, connected } = useWallet();
  const { transactions } = useAppStore();

  if (!connected || !address) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <Wallet className="mx-auto h-12 w-12 text-zinc-600" />
        <h1 className="mt-4 text-2xl font-bold text-white">Connect Your Wallet</h1>
        <p className="mt-2 text-zinc-400">
          Connect your Stellar wallet to view your dashboard
        </p>
      </div>
    );
  }

  const userTxs = transactions.filter(
    (t) => t.hash && t.hash.length > 0
  );
  const totalVolume = userTxs.reduce((sum, t) => {
    if (t.status === "confirmed" && t.action.startsWith("Buy")) {
      return sum + 1;
    }
    return sum;
  }, 0);

  return (
    <motion.div
      className="mx-auto max-w-5xl px-4 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* Stats cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Wallet className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Address</div>
              <div className="text-sm font-medium text-white">
                {shortenAddress(address, 6)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Coins className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Balance</div>
              <div className="text-sm font-medium text-white">
                {formatAmount(balance)} XLM
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
              <Activity className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Trades</div>
              <div className="text-sm font-medium text-white">
                {totalVolume}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs text-zinc-400">Rewards</div>
              <div className="text-sm font-medium text-white">0</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-sm text-emerald-400 hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {userTxs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 p-8 text-center">
            <p className="text-zinc-500">No activity yet</p>
            <Link
              href="/"
              className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
            >
              Browse markets →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {userTxs.slice(0, 5).map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3"
              >
                <div>
                  <div className="text-sm text-white">{tx.action}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(tx.timestamp).toLocaleString()}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    tx.status === "confirmed"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : tx.status === "pending"
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
