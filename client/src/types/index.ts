export interface Market {
  question: string;
  description: string;
  category: string;
  creator: string;
  close_time: number;
  resolution_time: number;
  dispute_window: number;
  status: number; // 0=Open, 1=Closed, 2=Resolving, 3=Disputed, 4=Finalized
  yes_pool: string;
  no_pool: string;
  oracle_result: number; // 0=None, 1=YES, 2=NO
  disputed: boolean;
}

export interface Odds {
  yes_prob: number; // basis points (0-10000)
  no_prob: number;
}

export interface Position {
  yes_bet: string;
  no_bet: string;
}

export interface TransactionStatus {
  hash: string;
  status: "pending" | "confirmed" | "failed";
  timestamp: number;
  confirmedAt?: number;
  explorerUrl?: string;
  action: string;
  marketId?: number;
}

export interface ContractEvent {
  type: string;
  timestamp: number;
  wallet: string;
  marketId: number;
  action: string;
  data?: Record<string, unknown>;
}

export type WalletProvider = "freighter" | "xbull" | "albedo" | "lobstr" | "rabet";

export interface WalletConnection {
  address: string;
  network: string;
  balance: string;
  provider: WalletProvider;
}
