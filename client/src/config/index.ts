// OracleBet Configuration
// Update these after contract deployment
export const CONFIG = {
  contractId: "CD5OLPVADHW6J5TTX6QV5YJVCPRISFDIEUMW4CKSA4VIVHL6WGCMOSOF",
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  stellarNetwork: "testnet" as const,
  oraclePublicKey: "GDQWRVPU2YSHUETJSZNMARMKAR32ABJHSLXHXKM3Z3RDMFYRGGUKMA6L",
};

export const STATUS = {
  0: { label: "Open", color: "bg-green-500" },
  1: { label: "Closed", color: "bg-yellow-500" },
  2: { label: "Resolving", color: "bg-blue-500" },
  3: { label: "Disputed", color: "bg-red-500" },
  4: { label: "Finalized", color: "bg-purple-500" },
} as const;

export const RESULT = {
  0: "Pending",
  1: "YES",
  2: "NO",
} as const;
