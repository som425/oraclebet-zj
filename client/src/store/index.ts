import { create } from "zustand";
import type { TransactionStatus, ContractEvent } from "@/types";

interface AppState {
  // Wallet
  address: string | null;
  balance: string;
  network: string;
  isConnected: boolean;
  walletModalOpen: boolean;

  // Transactions
  transactions: TransactionStatus[];

  // Events
  events: ContractEvent[];

  // UI
  theme: "light" | "dark";

  // Actions
  setAddress: (addr: string | null) => void;
  setBalance: (bal: string) => void;
  setNetwork: (net: string) => void;
  setConnected: (connected: boolean) => void;
  setWalletModalOpen: (open: boolean) => void;
  addTransaction: (tx: TransactionStatus) => void;
  updateTransaction: (hash: string, updates: Partial<TransactionStatus>) => void;
  addEvent: (event: ContractEvent) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  address: null,
  balance: "0",
  network: "",
  isConnected: false,
  walletModalOpen: false,
  transactions: [],
  events: [],
  theme: "dark",

  setAddress: (addr) => set({ address: addr }),
  setBalance: (bal) => set({ balance: bal }),
  setNetwork: (net) => set({ network: net }),
  setConnected: (connected) => set({ isConnected: connected }),
  setWalletModalOpen: (open) => set({ walletModalOpen: open }),
  addTransaction: (tx) =>
    set((s) => ({ transactions: [tx, ...s.transactions].slice(0, 50) })),
  updateTransaction: (hash, updates) =>
    set((s) => ({
      transactions: s.transactions.map((t) =>
        t.hash === hash ? { ...t, ...updates } : t
      ),
    })),
  addEvent: (event) =>
    set((s) => ({ events: [event, ...s.events].slice(0, 100) })),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
}));
