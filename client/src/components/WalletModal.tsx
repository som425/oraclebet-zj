"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

const wallets = [
  {
    id: "freighter" as const,
    name: "Freighter",
    desc: "Stellar wallet browser extension",
    icon: "🔷",
  },
  {
    id: "xbull" as const,
    name: "xBull",
    desc: "Stellar wallet browser extension",
    icon: "🐂",
  },
  {
    id: "albedo" as const,
    name: "Albedo",
    desc: "Web-based Stellar wallet",
    icon: "✨",
  },
  {
    id: "lobstr" as const,
    name: "LOBSTR",
    desc: "Stellar wallet browser extension",
    icon: "🦞",
  },
];

interface Props {
  onConnect: () => void;
  isLoading: boolean;
  error: string | null;
}

export function WalletModal({ onConnect, isLoading, error }: Props) {
  const { walletModalOpen, setWalletModalOpen } = useAppStore();

  return (
    <Dialog.Root open={walletModalOpen} onOpenChange={setWalletModalOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-zinc-900 p-6 shadow-2xl">
          <Dialog.Close className="absolute right-4 top-4 text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </Dialog.Close>

          <Dialog.Title className="flex items-center gap-2 text-xl font-bold text-white">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-zinc-400">
            Choose a wallet to connect to OracleBet
          </Dialog.Description>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-2">
            {wallets.map((w) => (
              <button
                key={w.id}
                onClick={onConnect}
                disabled={isLoading}
                className={cn(
                  "flex w-full items-center gap-4 rounded-xl border border-zinc-700 p-4 text-left transition-all",
                  "hover:border-emerald-500/50 hover:bg-zinc-800",
                  "disabled:opacity-50"
                )}
              >
                <span className="text-2xl">{w.icon}</span>
                <div className="flex-1">
                  <div className="font-medium text-white">{w.name}</div>
                  <div className="text-xs text-zinc-400">{w.desc}</div>
                </div>
                {isLoading && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                )}
              </button>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
