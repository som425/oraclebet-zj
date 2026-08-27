"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  rpc,
  Contract,
  nativeToScVal,
  scValToNative,
  Address,
  TimeoutInfinite,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { CONFIG } from "@/config";
import { useWallet } from "./useWallet";
import { useAppStore } from "@/store";
import type { Market, Odds, Position } from "@/types";
import type { xdr } from "@stellar/stellar-sdk";

// --- ScVal Converters ---

export function toScValString(v: string): xdr.ScVal {
  return nativeToScVal(v, { type: "string" }) as xdr.ScVal;
}

export function toScValU64(v: number): xdr.ScVal {
  return nativeToScVal(v, { type: "u64" }) as xdr.ScVal;
}

export function toScValU32(v: number): xdr.ScVal {
  return nativeToScVal(v, { type: "u32" }) as xdr.ScVal;
}

export function toScValI128(v: string | number): xdr.ScVal {
  return nativeToScVal(v, { type: "i128" }) as xdr.ScVal;
}

export function toScValAddress(v: string): xdr.ScVal {
  return new Address(v).toScVal();
}

// --- Read contract (simulate only, no signing) ---

export async function readContract(
  method: string,
  params: xdr.ScVal[],
  source?: string
) {
  const server = new rpc.Server(CONFIG.rpcUrl);
  const contract = new Contract(CONFIG.contractId);

  const sourceAccount = source
    ? await server.getAccount(source)
    : await server.getAccount(
        "GAOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO"
      );

  const tx = new TransactionBuilder(sourceAccount, {
    fee: "100",
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .setTimeout(TimeoutInfinite)
    .addOperation(contract.call(method, ...params))
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error(`Simulation failed for ${method}`);
  }
  if (!sim.result) {
    throw new Error(`No result for ${method}`);
  }
  return sim.result.retval;
}

// --- Write contract (simulate + assemble + sign + send) ---

export async function callContract(
  method: string,
  params: xdr.ScVal[],
  source: string,
  signAndSend: (txXdr: string) => Promise<string | null>
) {
  const server = new rpc.Server(CONFIG.rpcUrl);
  const contract = new Contract(CONFIG.contractId);

  const account = await server.getAccount(source);
  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .setTimeout(TimeoutInfinite)
    .addOperation(contract.call(method, ...params))
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    const failure = sim as rpc.Api.SimulateTransactionErrorResponse;
    const details = [
      failure.error,
      failure.latestLedger ? `latest ledger ${failure.latestLedger}` : undefined,
    ]
      .filter(Boolean)
      .join(" — ");
    const message = `${failure.error ?? ""}`;
    const abiHint = message.includes("MismatchingParameterLen")
      ? " The deployed contract ABI does not match this client. Redeploy the current Soroban contract and update the contract address."
      : "";
    throw new Error(`Simulation failed for ${method}${details ? `: ${details}` : ""}.${abiHint}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const txXdr = prepared.toXDR();
  const hash = await signAndSend(txXdr);
  if (!hash) {
    throw new Error(`Transaction ${method} was not submitted`);
  }
  return hash;
}

async function waitForTransaction(hash: string, timeoutMs = 45_000) {
  const server = new rpc.Server(CONFIG.rpcUrl);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const result = await server.getTransaction(hash);
      if (result.status === "SUCCESS") return result;
      if (result.status === "FAILED") throw new Error(`Transaction failed: ${hash}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Transaction failed:")) throw error;
      // RPC can briefly return NOT_FOUND while the transaction propagates.
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`Transaction is still pending after ${timeoutMs / 1000}s: ${hash}`);
}

// --- Market ScVal parsing ---

export function scvToMarket(scv: xdr.ScVal): Market {
  const map = scv.map();
  if (!map) throw new Error("Expected map");

  const getStr = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return "";
    return String(scValToNative(e.val()));
  };
  const getU64 = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return 0;
    return Number(scValToNative(e.val()));
  };
  const getU32 = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return 0;
    return Number(scValToNative(e.val()));
  };
  const getI128 = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return "0";
    return String(scValToNative(e.val()));
  };
  const getBool = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return false;
    return Boolean(scValToNative(e.val()));
  };
  const getAddr = (k: string) => {
    const e = map.find((entry) => String(scValToNative(entry.key())) === k);
    if (!e) return "";
    return String(scValToNative(e.val()));
  };

  return {
    question: getStr("question"),
    description: getStr("description"),
    category: getStr("category"),
    creator: getAddr("creator"),
    close_time: getU64("close_time"),
    resolution_time: getU64("resolution_time"),
    dispute_window: getU64("dispute_window"),
    status: getU32("status"),
    yes_pool: getI128("yes_pool"),
    no_pool: getI128("no_pool"),
    oracle_result: getU32("oracle_result"),
    disputed: getBool("disputed"),
  };
}

// --- React Hooks ---

export function useMarket(marketId: number) {
  return useQuery<Market>({
    queryKey: ["market", marketId],
    queryFn: async () => {
      const retval = await readContract("get_market", [toScValU64(marketId)]);
      return scvToMarket(retval);
    },
    enabled: !!CONFIG.contractId && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
  });
}

export function useOdds(marketId: number) {
  return useQuery<Odds>({
    queryKey: ["odds", marketId],
    queryFn: async () => {
      const retval = await readContract("get_odds", [toScValU64(marketId)]);
      const vec = retval.vec();
      if (!vec) return { yes_prob: 5000, no_prob: 5000 };
      return {
        yes_prob: Number(scValToNative(vec[0])),
        no_prob: Number(scValToNative(vec[1])),
      };
    },
    enabled: !!CONFIG.contractId && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
    refetchInterval: 10_000,
  });
}

export function usePosition(marketId: number, user: string | null) {
  return useQuery<Position>({
    queryKey: ["position", marketId, user],
    queryFn: async () => {
      if (!user) return { yes_bet: "0", no_bet: "0" };
      const retval = await readContract("get_position", [
        toScValAddress(user),
        toScValU64(marketId),
      ]);
      const vec = retval.vec();
      if (!vec) return { yes_bet: "0", no_bet: "0" };
      return {
        yes_bet: String(scValToNative(vec[0])),
        no_bet: String(scValToNative(vec[1])),
      };
    },
    enabled:
      !!user && !!CONFIG.contractId && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
  });
}

export function usePayout(marketId: number, user: string | null) {
  return useQuery<string>({
    queryKey: ["payout", marketId, user],
    queryFn: async () => {
      if (!user) return "0";
      const retval = await readContract("get_payout", [
        toScValAddress(user),
        toScValU64(marketId),
      ]);
      return String(scValToNative(retval));
    },
    enabled:
      !!user && !!CONFIG.contractId && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
  });
}

export function useMarketCount() {
  return useQuery<number>({
    queryKey: ["marketCount"],
    queryFn: async () => {
      const retval = await readContract("get_market_count", []);
      return Number(scValToNative(retval));
    },
    enabled: !!CONFIG.contractId && CONFIG.contractId !== "YOUR_CONTRACT_ADDRESS_HERE",
  });
}

// --- Mutations ---

export function useBuyYes() {
  const queryClient = useQueryClient();
  const { signAndSend, address } = useWallet();

  return useMutation({
    mutationFn: async ({
      marketId,
      amount,
    }: {
      marketId: number;
      amount: string;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await callContract(
        "buy_yes",
        [toScValAddress(address), toScValU64(marketId), toScValI128(amount)],
        address,
        signAndSend
      );
      return { hash, marketId, amount, outcome: "YES" as const };
    },
    onSuccess: ({ hash, marketId, amount, outcome }) => {
      useAppStore.getState().addTransaction({
        hash: hash ?? "",
        status: "pending",
        timestamp: Date.now(),
        action: `Buy ${outcome}`,
        marketId,
      });
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["odds", marketId] });
      queryClient.invalidateQueries({ queryKey: ["position", marketId] });
    },
  });
}

export function useBuyNo() {
  const queryClient = useQueryClient();
  const { signAndSend, address } = useWallet();

  return useMutation({
    mutationFn: async ({
      marketId,
      amount,
    }: {
      marketId: number;
      amount: string;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await callContract(
        "buy_no",
        [toScValAddress(address), toScValU64(marketId), toScValI128(amount)],
        address,
        signAndSend
      );
      return { hash, marketId, amount, outcome: "NO" as const };
    },
    onSuccess: ({ hash, marketId, amount, outcome }) => {
      useAppStore.getState().addTransaction({
        hash: hash ?? "",
        status: "pending",
        timestamp: Date.now(),
        action: `Buy ${outcome}`,
        marketId,
      });
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["odds", marketId] });
      queryClient.invalidateQueries({ queryKey: ["position", marketId] });
    },
  });
}

export function useCreateMarket() {
  const queryClient = useQueryClient();
  const { signAndSend, address } = useWallet();

  return useMutation({
    mutationFn: async (params: {
      question: string;
      description: string;
      category: string;
      closeTime: number;
      disputeWindow: number;
    }) => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await callContract(
        "create_market",
        [
          toScValAddress(address),
          toScValString(params.question),
          toScValString(params.description),
          toScValString(params.category),
          toScValU64(params.closeTime),
          toScValU64(params.disputeWindow),
        ],
        address,
        signAndSend
      );
      await waitForTransaction(hash);
      return { hash, ...params };
    },
    onSuccess: async ({ hash }) => {
      useAppStore.getState().addTransaction({
        hash,
        status: "confirmed",
        timestamp: Date.now(),
        confirmedAt: Date.now(),
        action: "Create Market",
        marketId: 0,
      });
      await queryClient.invalidateQueries({ queryKey: ["marketCount"] });
      await queryClient.refetchQueries({ queryKey: ["marketCount"] });
      await queryClient.invalidateQueries({ queryKey: ["allMarkets"] });
      await queryClient.refetchQueries({ queryKey: ["allMarkets"] });
    },
  });
}

// --- Transaction Status Polling ---

export function useTransactionPolling() {
  const { transactions, updateTransaction } = useAppStore();

  return useQuery({
    queryKey: ["txPolling"],
    queryFn: async () => {
      const pending = transactions.filter((tx) => tx.status === "pending" && tx.hash);
      if (pending.length === 0) return null;

      const server = new rpc.Server(CONFIG.rpcUrl);

      for (const tx of pending) {
        try {
          const result = await server.getTransaction(tx.hash);
          if (result.status === "SUCCESS") {
            updateTransaction(tx.hash, { status: "confirmed", confirmedAt: Date.now() });
          } else if (result.status === "FAILED") {
            updateTransaction(tx.hash, { status: "failed" });
          }
          // If status is NOT_FOUND, skip (still pending)
        } catch {
          // skip — will retry on next poll
        }
      }
      return null;
    },
    enabled: transactions.some((tx) => tx.status === "pending" && !!tx.hash),
    refetchInterval: 5_000,
  });
}

export function useClaimReward() {
  const queryClient = useQueryClient();
  const { signAndSend, address } = useWallet();

  return useMutation({
    mutationFn: async (marketId: number) => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await callContract(
        "claim_reward",
        [toScValAddress(address), toScValU64(marketId)],
        address,
        signAndSend
      );
      return { hash, marketId };
    },
    onSuccess: ({ hash, marketId }) => {
      useAppStore.getState().addTransaction({
        hash: hash ?? "",
        status: "pending",
        timestamp: Date.now(),
        action: "Claim Reward",
        marketId,
      });
      queryClient.invalidateQueries({ queryKey: ["market", marketId] });
      queryClient.invalidateQueries({ queryKey: ["payout", marketId] });
      queryClient.invalidateQueries({ queryKey: ["position", marketId] });
    },
  });
}
