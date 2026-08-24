"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useMarket, useOdds, usePosition, usePayout, useBuyYes, useBuyNo, useClaimReward } from "@/hooks/contract";
import { useWallet } from "@/hooks/useWallet";
import { OddsBar } from "@/components/OddsBar";
import { MarketDetailSkeleton } from "@/components/Skeleton";
import { Wallet, Loader2, ArrowLeft, Clock, AlertTriangle, CheckCircle, Trophy } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  formatAmount,
  formatTimestamp,
  statusLabel,
  resultLabel,
  timeRemaining,
} from "@/lib/utils";

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = Number(params.id);
  const { connected, address } = useWallet();

  const { data: market, isLoading, error } = useMarket(marketId);
  const { data: odds } = useOdds(marketId);
  const { data: position } = usePosition(marketId, address);
  const { data: payout } = usePayout(marketId, address);

  const buyYes = useBuyYes();
  const buyNo = useBuyNo();
  const claim = useClaimReward();

  const [amount, setAmount] = useState("");

  const handleBuy = async (outcome: "YES" | "NO") => {
    if (!amount || Number(amount) <= 0) return;
    if (outcome === "YES") {
      buyYes.mutate({ marketId, amount });
    } else {
      buyNo.mutate({ marketId, amount });
    }
  };

  if (isLoading) {
    return <MarketDetailSkeleton />;
  }

  if (error || !market) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-xl font-bold text-white">Market Not Found</h2>
        <Link href="/" className="mt-4 inline-block text-emerald-400 hover:underline">
          ← Back to Markets
        </Link>
      </div>
    );
  }

  const totalPool = Number(market.yes_pool) + Number(market.no_pool);
  const yesProb = odds?.yes_prob ?? 5000;
  const noProb = odds?.no_prob ?? 5000;

  return (
    <motion.div
      className="mx-auto max-w-4xl px-4 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Markets
      </Link>

      {/* Market header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-white ${
                  market.status === 0
                    ? "bg-green-500"
                    : market.status === 1
                    ? "bg-yellow-500"
                    : market.status === 2
                    ? "bg-blue-500"
                    : market.status === 3
                    ? "bg-red-500"
                    : "bg-purple-500"
                }`}
              >
                {statusLabel(market.status)}
              </span>
              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
                {market.category}
              </span>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white">
              {market.question}
            </h1>
            <p className="mt-2 text-zinc-400">{market.description}</p>
          </div>
        </div>

        {/* Odds */}
        <div className="mt-6">
          <OddsBar
            yesProb={yesProb}
            noProb={noProb}
          />
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-400">Total Liquidity</div>
            <div className="text-sm font-semibold text-white">
              {formatAmount(String(totalPool))}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-400">YES Pool</div>
            <div className="text-sm font-semibold text-emerald-400">
              {formatAmount(market.yes_pool)}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-400">NO Pool</div>
            <div className="text-sm font-semibold text-red-400">
              {formatAmount(market.no_pool)}
            </div>
          </div>
          <div className="rounded-xl bg-zinc-800/50 p-3">
            <div className="text-xs text-zinc-400">Close Time</div>
            <div className="text-sm font-semibold text-white">
              {timeRemaining(market.close_time)}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3.5 w-3.5" />
            Close: {formatTimestamp(market.close_time)}
          </div>
          {market.resolution_time > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <CheckCircle className="h-3.5 w-3.5" />
              Resolution: {formatTimestamp(market.resolution_time)}
            </div>
          )}
          {market.oracle_result > 0 && (
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Trophy className="h-3.5 w-3.5" />
              Result: {resultLabel(market.oracle_result)}
            </div>
          )}
          {market.disputed && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              Disputed
            </div>
          )}
        </div>

        {/* Your position */}
        {position && (Number(position.yes_bet) > 0 || Number(position.no_bet) > 0) && (
          <div className="mt-6 rounded-xl border border-zinc-700 bg-zinc-800/30 p-4">
            <h3 className="text-sm font-semibold text-white">Your Position</h3>
            <div className="mt-2 flex gap-4 text-sm">
              <div>
                <span className="text-zinc-400">YES bet: </span>
                <span className="font-medium text-emerald-400">
                  {formatAmount(position.yes_bet)}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">NO bet: </span>
                <span className="font-medium text-red-400">
                  {formatAmount(position.no_bet)}
                </span>
              </div>
            </div>
            {payout && Number(payout) > 0 && (
              <div className="mt-2">
                <span className="text-zinc-400">Estimated payout: </span>
                <span className="font-medium text-emerald-400">
                  {formatAmount(payout)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trading panel */}
      {market.status === 0 && connected && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Trade</h2>
          <div className="mt-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
              min="0"
              step="1"
            />
          </div>
          <div className="mt-3 flex gap-3">
            <button
              onClick={() => handleBuy("YES")}
              disabled={buyYes.isPending || !amount}
              className="flex-1 rounded-xl bg-emerald-500 py-3 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {buyYes.isPending ? "Processing..." : "Buy YES"}
            </button>
            <button
              onClick={() => handleBuy("NO")}
              disabled={buyNo.isPending || !amount}
              className="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-50"
            >
              {buyNo.isPending ? "Processing..." : "Buy NO"}
            </button>
          </div>
        </div>
      )}

      {/* Claim reward */}
      {market.status === 4 && payout && Number(payout) > 0 && (
        <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-400" />
            <div>
              <h2 className="font-semibold text-white">Reward Available</h2>
              <p className="text-sm text-emerald-400">
                {formatAmount(payout)} tokens to claim
              </p>
            </div>
            <button
              onClick={() => claim.mutate(marketId)}
              disabled={claim.isPending}
              className="ml-auto rounded-xl bg-emerald-500 px-6 py-2.5 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {claim.isPending ? "Claiming..." : "Claim Reward"}
            </button>
          </div>
        </div>
      )}

      {/* Not connected */}
      {!connected && market.status === 0 && (
        <div className="mt-6 rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
          <Wallet className="mx-auto h-8 w-8 text-zinc-500" />
          <p className="mt-2 text-zinc-400">
            Connect your wallet to trade on this market
          </p>
        </div>
      )}
    </motion.div>
  );
}
