"use client";

import { useAppStore } from "@/store";
import { Activity, Zap } from "lucide-react";
import { formatTimestamp, shortenAddress } from "@/lib/utils";
import { motion } from "framer-motion";

export default function ActivityPage() {
  const { events } = useAppStore();

  return (
    <motion.div
      className="mx-auto max-w-4xl px-4 py-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6 flex items-center gap-3">
        <Zap className="h-6 w-6 text-emerald-400" />
        <h1 className="text-2xl font-bold text-white">Event Feed</h1>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-700 p-12 text-center">
          <Activity className="mx-auto h-10 w-10 text-zinc-600" />
          <p className="mt-3 text-zinc-500">No events yet</p>
          <p className="text-sm text-zinc-600">
            Events will appear here as you interact with the platform
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                <Zap className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {event.type}
                </div>
                <div className="text-xs text-zinc-500">
                  {event.wallet} &middot;{" "}
                  {formatTimestamp(Math.floor(event.timestamp / 1000))}
                </div>
              </div>
              {event.marketId > 0 && (
                <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                  #{event.marketId}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
