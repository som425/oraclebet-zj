"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import { rpc, TransactionBuilder } from "@stellar/stellar-sdk";
import { CONFIG } from "@/config";
import { useAppStore } from "@/store";
import { shortenAddress } from "@/lib/utils";

export function useWallet() {
  const {
    address,
    balance,
    isConnected: connected,
    setAddress,
    setBalance,
    setConnected,
    setNetwork,
    setWalletModalOpen,
  } = useAppStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const isConn = await isConnected();
      if (isConn) {
        const allowed = await isAllowed();
        if (allowed) {
          const res = await getAddress();
          if (res.address) {
            setAddress(res.address);
            setConnected(true);
            await fetchBalance(res.address);
          }
        }
      }
    } catch {
      // Wallet not installed
    }
  }, [setAddress, setConnected]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const installed = await isConnected();
      if (!installed) {
        setError(
          "Freighter wallet not detected. Please install the Freighter browser extension."
        );
        return;
      }

      const access = await requestAccess();
      if (!access) {
        setError("Access denied by user.");
        return;
      }

      const res = await getAddress();
      if (!res.address) {
        setError("Could not retrieve wallet address.");
        return;
      }

      setAddress(res.address);
      setConnected(true);
      setNetwork(CONFIG.stellarNetwork);
      await fetchBalance(res.address);
      setWalletModalOpen(false);

      useAppStore.getState().addEvent({
        type: "Wallet Connected",
        timestamp: Date.now(),
        wallet: shortenAddress(res.address),
        marketId: 0,
        action: "Wallet Connected",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to connect wallet";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [setAddress, setConnected, setNetwork, setWalletModalOpen]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setBalance("0");
    setConnected(false);
    setNetwork("");
  }, [setAddress, setBalance, setConnected, setNetwork]);

  const fetchBalance = useCallback(
    async (addr: string) => {
      try {
        const horizonUrl = CONFIG.horizonUrl;
        const res = await fetch(
          `${horizonUrl}/accounts/${addr}`
        );
        if (res.ok) {
          const data = await res.json();
          const nativeBalance = data.balances?.find(
            (b: { asset_type: string }) => b.asset_type === "native"
          );
          if (nativeBalance) {
            setBalance(Number(nativeBalance.balance).toFixed(7));
          }
        }
      } catch {
        setBalance("0");
      }
    },
    [setBalance]
  );

  const signAndSend = useCallback(
    async (txXdr: string): Promise<string | null> => {
      try {
        const { signedTxXdr } = await signTransaction(txXdr, {
          networkPassphrase: CONFIG.networkPassphrase,
        });

        const server = new rpc.Server(CONFIG.rpcUrl);

        // Parse from XDR
        const tx = TransactionBuilder.fromXDR(signedTxXdr, CONFIG.networkPassphrase);

        // Simulate
        const sim = await server.simulateTransaction(tx);
        if (!rpc.Api.isSimulationSuccess(sim) && !rpc.Api.isSimulationRestore(sim)) {
          throw new Error("Transaction simulation failed");
        }

        const prepared = rpc.assembleTransaction(tx, sim).build();
        const sendRes = await server.sendTransaction(prepared);

        if (sendRes.status === "PENDING" || sendRes.status === "DUPLICATE") {
          return sendRes.hash;
        }
        throw new Error(`Send failed: ${sendRes.status}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Transaction failed";
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const refreshBalance = useCallback(async () => {
    if (address) {
      await fetchBalance(address);
    }
  }, [address, fetchBalance]);

  return {
    address,
    balance,
    connected,
    isLoading,
    error,
    connect,
    disconnect,
    signAndSend,
    refreshBalance,
    setWalletModalOpen,
    checkConnection,
  };
}
