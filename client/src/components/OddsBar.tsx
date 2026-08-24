"use client";

import { cn, formatBps } from "@/lib/utils";
import { motion } from "framer-motion";

interface Props {
  yesProb: number;
  noProb: number;
  className?: string;
}

export function OddsBar({ yesProb, noProb, className }: Props) {
  const yesPct = yesProb / 100;
  const noPct = noProb / 100;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex h-7 w-full overflow-hidden rounded-full bg-zinc-800">
        <motion.div
          className="flex items-center justify-start bg-emerald-500 px-2 text-xs font-bold text-black"
          animate={{ width: `${Math.max(yesPct, 2)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {yesPct > 8 && `${yesPct.toFixed(1)}%`}
        </motion.div>
        <motion.div
          className="flex items-center justify-end bg-red-500 px-2 text-xs font-bold text-white"
          animate={{ width: `${Math.max(noPct, 2)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {noPct > 8 && `${noPct.toFixed(1)}%`}
        </motion.div>
      </div>
      <div className="flex justify-between text-xs">
        <motion.span
          key={yesProb}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-medium text-emerald-400"
        >
          YES {formatBps(yesProb)}
        </motion.span>
        <motion.span
          key={noProb}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-medium text-red-400"
        >
          NO {formatBps(noProb)}
        </motion.span>
      </div>
    </div>
  );
}
