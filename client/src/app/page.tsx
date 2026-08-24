"use client";

import { useState } from "react";
import { useMarketCount } from "@/hooks/contract";
import { MarketCard } from "@/components/MarketCard";
import { MarketCardSkeleton } from "@/components/Skeleton";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/store";
import type { Market } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { readContract, toScValU64, scvToMarket } from "@/hooks/contract";
import { CONFIG } from "@/config";
import { TrendingUp, PlusCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

function useAllMarkets() {
  const { data: count } = useMarketCount();
  const countNum = count ?? 0;

  const ids = Array.from({ length: countNum }, (_, i) => i + 1);

  const markets = useQuery({
    queryKey: ["allMarkets", countNum],
    queryFn: async () => {
      const results: Array<Market & { id: number }> = [];
      for (const id of ids) {
        try {
          const retval = await readContract("get_market", [toScValU64(id)]);
          const m = scvToMarket(retval);
          results.push({ ...m, id });
        } catch {
          // skip
        }
      }
      return results;
    },
    enabled: countNum > 0 && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
  });

  return markets;
}

export default function HomePage() {
  const { data: markets, isLoading, error } = useAllMarkets();
  const { connected, address } = useWallet();
  const { setWalletModalOpen } = useAppStore();
  const [filter, setFilter] = useState<"all" | "open" | "closed" | "finalized">("all");

  const filtered = (markets ?? []).filter((m) => {
    if (filter === "all") return true;
    if (filter === "open") return m.status === 0;
    if (filter === "closed") return m.status === 1 || m.status === 2 || m.status === 3;
    if (filter === "finalized") return m.status === 4;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-zinc-900 to-zinc-900 p-8 border border-zinc-800">
        <h1 className="text-3xl font-bold text-white">
          Decentralized Prediction Markets
        </h1>
        <p className="mt-2 max-w-xl text-zinc-400">
          Bet on real-world outcomes using Stellar Soroban. Create markets, trade
          shares, and earn rewards.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/create"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
          >
            <PlusCircle className="h-4 w-4" />
            Create Market
          </Link>
          {!connected && (
            <button
              onClick={() => setWalletModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <TrendingUp className="h-4 w-4" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        {(["all", "open", "closed", "finalized"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-emerald-500 text-black"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Market grid */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <p className="text-red-400">
            {CONFIG.contractId === "YOUR_CONTRACT_ADDRESS_HERE"
              ? "Contract not deployed yet. Update CONTRACT_ID in config/index.ts after deployment."
              : "Failed to load markets. Check console for details."}
          </p>
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <p className="text-zinc-500">No markets found</p>
          <Link
            href="/create"
            className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
          >
            Create the first market →
          </Link>
        </div>
      )}

      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.05 } },
        }}
      >
        {filtered.map((market) => (
          <motion.div
            key={market.id}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0 },
            }}
          >
            <MarketCard market={market} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
