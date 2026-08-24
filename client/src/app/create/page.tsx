"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateMarket } from "@/hooks/contract";
import { useWallet } from "@/hooks/useWallet";
import { Wallet, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CreateMarketPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const createMarket = useCreateMarket();

  const [form, setForm] = useState({
    question: "",
    description: "",
    category: "Crypto",
    closeDate: "",
    closeTime: "",
    disputeWindow: "1",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const closeDateTime = new Date(`${form.closeDate}T${form.closeTime}:00`);
    const closeTimeUnix = Math.floor(closeDateTime.getTime() / 1000);
    const currentTime = Math.floor(Date.now() / 1000);
    const disputeWindowSecs = Number(form.disputeWindow) * 86400;

    if (closeTimeUnix <= currentTime) {
      alert("Close time must be in the future");
      return;
    }

    createMarket.mutate(
      {
        question: form.question,
        description: form.description,
        category: form.category,
        closeTime: closeTimeUnix,
        disputeWindow: disputeWindowSecs,
      },
      {
        onSuccess: () => {
          router.push("/");
        },
      }
    );
  };

  if (!connected) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Wallet className="mx-auto h-12 w-12 text-zinc-600" />
        <h1 className="mt-4 text-2xl font-bold text-white">
          Connect Your Wallet
        </h1>
        <p className="mt-2 text-zinc-400">
          You need to connect your wallet to create a market
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="mx-auto max-w-2xl px-4 py-8"
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

      <h1 className="text-2xl font-bold text-white">Create Prediction Market</h1>
      <p className="mt-1 text-zinc-400">
        Create a new binary outcome prediction market
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Question
          </label>
          <input
            type="text"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            placeholder='e.g. "Will Bitcoin reach $150,000 by Dec 2026?"'
            required
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the market conditions and resolution criteria"
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Category
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option>Crypto</option>
            <option>Sports</option>
            <option>Politics</option>
            <option>Technology</option>
            <option>Finance</option>
            <option>Entertainment</option>
            <option>Science</option>
            <option>General</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Close Date
            </label>
            <input
              type="date"
              value={form.closeDate}
              onChange={(e) => setForm({ ...form, closeDate: e.target.value })}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">
              Close Time
            </label>
            <input
              type="time"
              value={form.closeTime}
              onChange={(e) => setForm({ ...form, closeTime: e.target.value })}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300">
            Dispute Window (days)
          </label>
          <input
            type="number"
            value={form.disputeWindow}
            onChange={(e) => setForm({ ...form, disputeWindow: e.target.value })}
            min="1"
            max="30"
            className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:border-emerald-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Time window after resolution for disputing the outcome
          </p>
        </div>

        <button
          type="submit"
          disabled={createMarket.isPending}
          className="w-full rounded-xl bg-emerald-500 py-3.5 font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
        >
          {createMarket.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating Market...
            </span>
          ) : (
            "Create Market"
          )}
        </button>

        {createMarket.isError && (
          <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-400">
            {createMarket.error?.message || "Failed to create market"}
          </div>
        )}
      </form>
    </motion.div>
  );
}
