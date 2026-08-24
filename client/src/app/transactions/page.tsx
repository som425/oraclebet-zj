"use client";

import { useAppStore } from "@/store";
import { History, ExternalLink } from "lucide-react";
import { formatTimestamp, getExplorerUrl } from "@/lib/utils";
import { motion } from "framer-motion";

export default function TransactionsPage() {
  const { transactions } = useAppStore();

  return (
    <motion.div
      className="mx-auto max-w-4xl px-4 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <History className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Transaction History</h1>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <History className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-zinc-500">No transactions yet</p>
          <p className="text-sm text-zinc-600">
            Your transaction history will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-800">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-400">
                  Explorer
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {transactions.map((tx) => (
                <tr key={tx.hash} className="transition-colors hover:bg-zinc-900/30">
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{tx.action}</div>
                    {tx.marketId && (
                      <div className="text-xs text-zinc-500">
                        Market #{tx.marketId}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-400">
                    {formatTimestamp(Math.floor(tx.timestamp / 1000))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        tx.status === "confirmed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tx.status === "pending"
                          ? "bg-yellow-500/10 text-yellow-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tx.hash && (
                      <a
                        href={getExplorerUrl(tx.hash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-400 hover:underline"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
