"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, BarChart3, PlusCircle, Activity, History, Menu, X } from "lucide-react";
import { cn, shortenAddress, formatAmount } from "@/lib/utils";
import { useAppStore } from "@/store";
import { useWallet } from "@/hooks/useWallet";
import { useState } from "react";
import { WalletModal } from "./WalletModal";

const navLinks = [
  { href: "/", label: "Markets", icon: BarChart3, exact: true },
  { href: "/dashboard", label: "Dashboard", icon: Wallet },
  { href: "/create", label: "Create", icon: PlusCircle },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/transactions", label: "History", icon: History },
];

export function Navbar() {
  const pathname = usePathname();
  const { address, balance, connected, connect, isLoading, error, setWalletModalOpen } =
    useWallet();
  const { walletModalOpen } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-black">
              OB
            </div>
            <span className="text-lg font-bold text-white">OracleBet</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Wallet section */}
          <div className="flex items-center gap-3">
            {connected && address ? (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-1.5">
                <div className="hidden text-right sm:block">
                  <div className="text-xs text-zinc-400">
                    {formatAmount(balance)} XLM
                  </div>
                </div>
                <div className="h-6 w-px bg-zinc-700 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-sm text-zinc-300">
                    {shortenAddress(address, 4)}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setWalletModalOpen(true)}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
              >
                <Wallet className="h-4 w-4" />
                Connect
              </button>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="text-zinc-400 md:hidden"
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-zinc-800 px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = link.exact
                  ? pathname === link.href
                  : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      <WalletModal onConnect={connect} isLoading={isLoading} error={error} />
    </>
  );
}
