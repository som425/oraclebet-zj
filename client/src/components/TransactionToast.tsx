"use client";

import * as Toast from "@radix-ui/react-toast";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react";
import { getExplorerUrl, cn } from "@/lib/utils";
import { useAppStore } from "@/store";

export function TransactionToast() {
  const { transactions } = useAppStore();
  const [open, setOpen] = useState(false);
  const [currentTx, setCurrentTx] = useState<(typeof transactions)[0] | null>(null);

  useEffect(() => {
    if (transactions.length > 0) {
      setCurrentTx(transactions[0]);
      setOpen(true);
    }
  }, [transactions]);

  if (!currentTx) return null;

  const isPending = currentTx.status === "pending";
  const isConfirmed = currentTx.status === "confirmed";
  const isFailed = currentTx.status === "failed";

  return (
    <Toast.Provider swipeDirection="right">
      <Toast.Root
        open={open}
        onOpenChange={setOpen}
        duration={isPending ? Infinity : 5000}
        className={cn(
          "fixed bottom-4 right-4 z-[100] w-full max-w-sm rounded-xl border p-4 shadow-2xl",
          isPending && "border-yellow-500/30 bg-zinc-900",
          isConfirmed && "border-emerald-500/30 bg-zinc-900",
          isFailed && "border-red-500/30 bg-zinc-900"
        )}
      >
        <div className="flex items-start gap-3">
          {isPending && (
            <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
          )}
          {isConfirmed && (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          )}
          {isFailed && <XCircle className="h-5 w-5 text-red-400" />}

          <div className="flex-1">
            <Toast.Title className="text-sm font-medium text-white">
              {currentTx.action}
            </Toast.Title>
            <Toast.Description className="mt-1 text-xs text-zinc-400">
              {isPending && "Waiting for confirmation..."}
              {isConfirmed && "Transaction confirmed"}
              {isFailed && "Transaction failed"}
            </Toast.Description>

            {currentTx.hash && (
              <a
                href={getExplorerUrl(currentTx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
              >
                View on Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <Toast.Close className="text-zinc-500 hover:text-white">
            <XCircle className="h-4 w-4" />
          </Toast.Close>
        </div>
      </Toast.Root>

      <Toast.Viewport />
    </Toast.Provider>
  );
}


