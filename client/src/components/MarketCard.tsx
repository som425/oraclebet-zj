"use client";

import Link from "next/link";
import { Clock, Users, Wallet } from "lucide-react";
import { cn, formatAmount, timeRemaining, statusLabel, statusColor } from "@/lib/utils";
import { OddsBar } from "./OddsBar";
import type { Market } from "@/types";

interface Props {
  market: Market & { id: number };
  odds?: { yes_prob: number; no_prob: number };
  className?: string;
}

export function MarketCard({ market, odds, className }: Props) {
  const yesProb = odds?.yes_prob ?? 5000;
  const noProb = odds?.no_prob ?? 5000;
  const totalLiquidity = String(Number(market.yes_pool) + Number(market.no_pool));

  return (
    <Link
      href={`/markets/${market.id}`}
      className={cn(
        "group block rounded-xl border border-border bg-panel/70 p-5 transition-all hover:-translate-y-0.5 hover:border-brand/50 hover:bg-panel",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white",
                statusColor(market.status)
              )}
            >
              {statusLabel(market.status)}
            </span>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
              {market.category}
            </span>
          </div>

          <h3 className="text-base font-semibold leading-snug text-white group-hover:text-emerald-400 transition-colors">
            {market.question}
          </h3>
        </div>
      </div>

      <OddsBar yesProb={yesProb} noProb={noProb} className="mt-4" />

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" />
            {formatAmount(totalLiquidity)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {timeRemaining(market.close_time)}
          </span>
        </div>
      </div>
    </Link>
  );
}
