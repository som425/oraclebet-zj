"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowUpRight, ChevronDown, CircleDot, Plus, Search, ShieldCheck, Sparkles, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CONFIG } from "@/config";
import { readContract, scvToMarket, toScValU64, useMarketCount } from "@/hooks/contract";
import { MarketCard } from "@/components/MarketCard";
import { MarketCardSkeleton } from "@/components/Skeleton";
import { useWallet } from "@/hooks/useWallet";
import { useAppStore } from "@/store";
import type { Market } from "@/types";

function useAllMarkets() {
  const { data: count } = useMarketCount();
  const countNum = count ?? 0;
  return useQuery({
    queryKey: ["allMarkets", countNum],
    queryFn: async () => {
      const results: Array<Market & { id: number }> = [];
      for (const id of Array.from({ length: countNum }, (_, index) => index + 1)) {
        try { results.push({ ...scvToMarket(await readContract("get_market", [toScValU64(id)])), id }); } catch { /* invalid or removed market */ }
      }
      return results;
    },
    enabled: countNum > 0 && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
    refetchInterval: 15_000,
  });
}

export default function HomePage() {
  const { data: markets, isLoading, error, refetch } = useAllMarkets();
  const { connected } = useWallet();
  const { setWalletModalOpen } = useAppStore();
  const [filter, setFilter] = useState<"all" | "open" | "closing" | "finalized">("all");
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => (markets ?? []).filter((market) => {
    const textMatch = `${market.question} ${market.category}`.toLowerCase().includes(search.toLowerCase());
    const statusMatch = filter === "all" || (filter === "open" && market.status === 0) || (filter === "closing" && [1, 2, 3].includes(market.status)) || (filter === "finalized" && market.status === 4);
    return textMatch && statusMatch;
  }), [markets, filter, search]);
  const openCount = (markets ?? []).filter((market) => market.status === 0).length;
  const liquidity = (markets ?? []).reduce((total, market) => total + Number(market.yes_pool) + Number(market.no_pool), 0);

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-panel px-3 py-1.5 text-xs font-medium text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-brand" />Soroban testnet / oracle feed active</div>
            <h1 className="max-w-3xl text-balance font-mono text-4xl font-semibold tracking-[-0.06em] text-foreground sm:text-6xl">Markets for the <span className="text-brand">uncertain.</span></h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-7 text-muted-foreground">OracleBet is a transparent prediction protocol on Stellar. Price outcomes, follow settlement events, and let the chain keep the score.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/create" className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90"><Plus className="h-4 w-4" />Create market</Link>{!connected && <button onClick={() => setWalletModalOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-panel"><Zap className="h-4 w-4 text-brand" />Connect wallet</button>}</div>
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border"><Metric label="Open markets" value={String(openCount).padStart(2, "0")} icon={CircleDot} /><Metric label="Tracked liquidity" value={`${(liquidity / 1_000_000).toFixed(1)}M`} icon={TrendingUp} /><Metric label="Network" value="TESTNET" icon={ShieldCheck} /><Metric label="Stream" value="15 SEC" icon={Activity} /></div>
        </div>
      </section>
      <section className="border-y border-border bg-surface/60"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-brand">Live markets</p><h2 className="mt-1 font-mono text-xl font-semibold text-foreground">Find your edge</h2></div><div className="flex flex-col gap-3 sm:flex-row"><label className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search markets" className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand sm:w-56" /></label><div className="flex rounded-md border border-border bg-background p-1">{(["all", "open", "closing", "finalized"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded px-3 py-1 text-xs font-medium capitalize transition ${filter === item ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}>{item}</button>)}</div></div></div></section>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><div className="mb-5 flex items-center justify-between text-sm text-muted-foreground"><span>{filtered.length} markets indexed</span><span className="inline-flex items-center gap-2 font-mono text-xs"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />Polling RPC</span></div>{isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <MarketCardSkeleton key={index} />)}</div> : error ? <div className="rounded-xl border border-danger/40 bg-danger/10 p-8 text-center"><p className="text-danger">Unable to reach the contract right now.</p><button onClick={() => refetch()} className="mt-3 text-sm text-foreground underline">Retry connection</button></div> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-12 text-center"><Sparkles className="mx-auto h-5 w-5 text-brand" /><p className="mt-3 text-muted-foreground">No markets match this view.</p></div> : <motion.div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: .04 } } }}>{filtered.map((market) => <motion.div key={market.id} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}><MarketCard market={market} /></motion.div>)}</motion.div>}</main>
      <div className="mx-auto flex max-w-7xl justify-end px-4 pb-12 sm:px-6 lg:px-8"><Link href="/activity" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-brand">View protocol activity <ArrowUpRight className="h-4 w-4" /></Link></div>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Activity }) { return <div className="bg-panel p-4 sm:p-5"><Icon className="h-4 w-4 text-brand" /><p className="mt-5 font-mono text-xl font-semibold text-foreground">{value}</p><p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p></div>; }

void ChevronDown;
