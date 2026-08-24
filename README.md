# OracleBet — Decentralized Prediction Markets on Stellar Soroban

**OracleBet** is a fully decentralized prediction market platform built on **Stellar Soroban**, where users can create markets, trade binary (YES/NO) outcome shares, and earn rewards — all on-chain.

---

## Features

- **Permissionless Markets** — Anyone can create a prediction market on any topic
- **Binary Outcomes** — Each market resolves to YES or NO
- **Liquidity-Based Odds** — Dynamic pricing using pool-weighted probability (LMSR-inspired)
- **Oracle Resolution** — Designated oracle submits the official outcome
- **Dispute Mechanism** — Participants can raise disputes within a configurable window
- **Reward Claims** — Winners claim their payout directly from the smart contract
- **Wallet Integration** — Connect via Freighter, xBull, Albedo, or LOBSTR wallets
- **Real-Time Updates** — Auto-refreshing odds, liquidity, and positions
- **Transaction Tracking** — Full history with explorer links and status indicators
- **Event Feed** — Live stream of all contract events

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Next.js Frontend                │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Pages   │ │ Components│ │  Hooks / Stores  │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │            │                 │           │
│  ┌────▼────────────▼─────────────────▼─────────┐ │
│  │         Contract Client (hooks/contract.ts)  │ │
│  └────────────────────┬────────────────────────┘ │
└───────────────────────┼─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│           Stellar RPC (Soroban Testnet)          │
│              ┌─────────────────┐                 │
│              │  OracleBet       │                 │
│              │  Smart Contract  │                 │
│              └────────┬────────┘                 │
└───────────────────────┼─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│              Stellar Network (Testnet)           │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Markets  │ │  Pools   │ │  Positions       │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

---

## Smart Contract Design

### Contract Structure

The Soroban contract (`contract/contracts/contract/src/lib.rs`) implements:

| Function | Type | Description |
|---|---|---|
| `initialize` | Write | Set oracle address (one-time) |
| `create_market` | Write | Create a new prediction market |
| `buy_yes` | Write | Buy YES shares |
| `buy_no` | Write | Buy NO shares |
| `close_market` | Write | Close market after end time |
| `resolve_market` | Write | Oracle submits result (YES=1, NO=2) |
| `raise_dispute` | Write | Dispute the oracle result |
| `resolve_dispute` | Write | Oracle resolves a dispute |
| `finalize_market` | Write | Finalize after dispute window expires |
| `claim_reward` | Write | Claim winnings |
| `get_market` | Read | Get market details |
| `get_odds` | Read | Get YES/NO probabilities in basis points |
| `get_position` | Read | Get user's YES/NO bet amounts |
| `get_payout` | Read | Get estimated payout for user |
| `get_market_count` | Read | Get total number of markets |

### Market States

```
Open (0) → Closed (1) → Resolving (2) → Finalized (4)
                              ↓
                         Disputed (3) → Resolving (2) → Finalized (4)
```

### Storage Architecture

- **Instance Storage**: Markets, market count, oracle address
- **Persistent Storage**: User positions (per-market, per-user)

### Odds Calculation

```
YES Probability = (YES Pool / Total Pool) × 10000 (in basis points)
NO Probability  = (NO Pool / Total Pool) × 10000 (in basis points)
```

### Payout Calculation

```
Payout = (Wager / Winning Pool) × Total Pool
```

---

## Business Logic

### Creating a Market

1. User connects wallet and submits:
   - Question (e.g., "Will BTC reach $150k by Dec 2026?")
   - Description
   - Category
   - Close time (when betting stops)
   - Dispute window (time after resolution for disputes)
2. Contract creates the market with `Open` status

### Trading

1. Users buy YES or NO shares by sending tokens to the pool
2. Odds update automatically based on pool ratios
3. Users can see their position at any time

### Resolution

1. After close time, market is closed
2. Oracle submits the official result (YES or NO)
3. Market enters `Resolving` state
4. Dispute window opens

### Disputes

- Any user can raise a dispute during the dispute window
- Oracle must resolve the dispute, returning market to `Resolving`
- After dispute window expires, anyone can finalize the market

### Reward Claims

- Winners claim their share of the total pool
- Payout is proportional to their wager within the winning side's pool
- Positions are zeroed after claim to prevent double-claiming

---

## Folder Structure

```
~/project/
├── contract/                          # Soroban Smart Contract
│   ├── Cargo.toml                     # Workspace root
│   ├── contracts/
│   │   └── contract/
│   │       ├── Cargo.toml             # Contract dependencies
│   │       ├── Makefile               # Build/test shortcuts
│   │       └── src/
│   │           ├── lib.rs             # Contract implementation
│   │           └── test.rs            # Comprehensive tests (19 tests)
│   └── target/                        # Compiled WASM output
│
├── client/                            # Next.js Frontend
│   ├── src/
│   │   ├── app/                       # Pages (App Router)
│   │   │   ├── page.tsx               # Home — market browsing
│   │   │   ├── layout.tsx             # Root layout with Navbar
│   │   │   ├── markets/
│   │   │   │   ├── page.tsx           # Redirects to /
│   │   │   │   └── [id]/page.tsx      # Market detail + trading
│   │   │   ├── dashboard/page.tsx     # Wallet dashboard
│   │   │   ├── create/page.tsx        # Market creation form
│   │   │   ├── activity/page.tsx      # Event feed
│   │   │   └── transactions/page.tsx  # Transaction history
│   │   ├── components/
│   │   │   ├── Navbar.tsx             # Navigation + wallet connect
│   │   │   ├── MarketCard.tsx         # Market preview card
│   │   │   ├── OddsBar.tsx            # YES/NO probability bar
│   │   │   ├── WalletModal.tsx        # Wallet selection modal
│   │   │   ├── TransactionToast.tsx   # Transaction notification
│   │   │   └── Providers.tsx          # TanStack Query provider
│   │   ├── hooks/
│   │   │   ├── contract.ts            # All contract interactions
│   │   │   └── useWallet.ts           # Wallet connection logic
│   │   ├── store/
│   │   │   └── index.ts               # Zustand state management
│   │   ├── types/
│   │   │   └── index.ts               # TypeScript type definitions
│   │   ├── lib/
│   │   │   └── utils.ts               # Utility functions
│   │   └── config/
│   │       └── index.ts               # Network configuration
│   ├── scripts/
│   │   └── deploy.ts                  # Deployment instructions
│   ├── public/                        # Static assets
│   ├── .env.example                   # Environment template
│   └── package.json
│
└── README.md                          # This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contract** | Rust, Soroban SDK v25 |
| **Frontend** | Next.js 16, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **State** | Zustand v5 |
| **Queries** | TanStack Query v5 |
| **Forms** | React Hook Form, Zod |
| **Animation** | Framer Motion v12 |
| **Icons** | Lucide React |
| **Wallet** | @stellar/freighter-api |
| **Blockchain** | @stellar/stellar-sdk v16 |
| **Package Manager** | Bun v1.3 |

---

## Installation

### Prerequisites

- **Bun** v1.0+ (for frontend)
- **Rust** (for contract compilation)
- **Stellar CLI** (for deployment)
- **Freighter Wallet** browser extension (for transactions)

### Quick Start

```bash
# Clone the repository
git clone <repo-url>
cd OracleBet

# Install frontend dependencies
cd client && bun install

# Build the contract
cd ../contract && stellar contract build
```

---

## Setup

### 1. Environment Variables

Copy the example env file and update it after deployment:

```bash
cp client/.env.example client/.env
```

### 2. Contract Deployment

```bash
# Generate a funded testnet key
stellar keys generate dev --network testnet --fund

# Build and deploy
cd contract
stellar contract build
stellar contract deploy \
  --wasm target/wasm32v1-none/release/oraclebet.wasm \
  --source-account dev \
  --network testnet
```

Copy the returned contract ID (C... format).

### 3. Initialize Oracle

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account dev \
  --network testnet \
  -- \
  initialize \
  --oracle <ORACLE_PUBKEY>
```

### 4. Configure Client

Edit `client/src/config/index.ts`:

```typescript
export const CONFIG = {
  contractId: "C...",  // Your deployed contract ID
  networkPassphrase: "Test SDF Network ; September 2015",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  stellarNetwork: "testnet",
  oraclePublicKey: "G...", // Oracle's public key
};
```

---

## Running Locally

```bash
# Terminal 1: Start the contract tests
cd contract && cargo test

# Terminal 2: Start the frontend
cd client && bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Testing

### Smart Contract Tests

```bash
cd contract
cargo test
```

All 19 tests should pass:
- Initialization (valid + double-init guard)
- Market creation
- Buy YES / Buy NO
- Odds calculation (50/50 → weighted)
- Market close (with time advance)
- Oracle resolution (authorized + unauthorized guards)
- Dispute lifecycle (raise → resolve)
- Market finalization
- Reward claiming (YES wins, NO wins, no-position guard)
- Payout queries (before/after finalization)
- Full end-to-end flow

### Frontend Build

```bash
cd client
bun run build
```

---

## Deployment to Stellar Testnet

See the detailed deployment guide:

```bash
bun run client/scripts/deploy.ts
```

Or follow the steps in [scripts/deploy.ts](client/scripts/deploy.ts).

---

## Deployment to Vercel

```bash
# Install Vercel CLI
bun install -g vercel

# Deploy
cd client
vercel --prod
```

Set the following environment variables in Vercel:
- `CONTRACT_ADDRESS`
- `NETWORK_PASSPHRASE`
- `RPC_URL`
- `HORIZON_URL`
- `STELLAR_NETWORK`
- `ORACLE_PUBLIC_KEY`

---

## API Reference

### Contract Functions

#### `initialize(env, oracle)`
Initialize the contract with the oracle address. Only callable once.

#### `create_market(env, creator, question, description, category, close_time, dispute_window) → u64`
Create a new prediction market. Returns the market ID.

#### `buy_yes(env, user, market_id, amount)`
Buy YES shares. Amount is added to the YES pool.

#### `buy_no(env, user, market_id, amount)`
Buy NO shares. Amount is added to the NO pool.

#### `close_market(env, market_id)`
Close the market after `close_time`. Only callable after close time.

#### `resolve_market(env, oracle, market_id, result)`
Submit the official result. `result`: 1 = YES, 2 = NO.

#### `raise_dispute(env, caller, market_id)`
Dispute the oracle's result. Only during dispute window.

#### `resolve_dispute(env, oracle, market_id)`
Oracle resolves the dispute, returning market to resolving state.

#### `finalize_market(env, market_id)`
Finalize the market after dispute window expires. Anyone can call.

#### `claim_reward(env, user, market_id) → i128`
Claim winnings. Returns the payout amount. Zeroes out positions.

#### `get_market(env, market_id) → Market`
Get full market details.

#### `get_odds(env, market_id) → (u32, u32)`
Get YES/NO probabilities in basis points (0-10000).

#### `get_position(env, user, market_id) → (i128, i128)`
Get user's YES and NO bet amounts.

#### `get_payout(env, user, market_id) → i128`
Get estimated payout for a user.

#### `get_market_count(env) → u64`
Get total number of markets.

### Frontend Hooks

| Hook | Returns | Description |
|---|---|---|
| `useMarket(id)` | `Market` | Fetch market details |
| `useOdds(id)` | `{yes_prob, no_prob}` | Fetch current odds |
| `usePosition(id, user)` | `{yes_bet, no_bet}` | Fetch user's position |
| `usePayout(id, user)` | `string` | Fetch estimated payout |
| `useMarketCount()` | `number` | Fetch total market count |
| `useBuyYes()` | mutation | Buy YES shares |
| `useBuyNo()` | mutation | Buy NO shares |
| `useCreateMarket()` | mutation | Create a new market |
| `useClaimReward()` | mutation | Claim winnings |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `CONTRACT_ADDRESS` | Deploy contract ID (C...) | — |
| `NETWORK_PASSPHRASE` | Stellar network passphrase | `Test SDF Network ; September 2015` |
| `RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `HORIZON_URL` | Horizon API endpoint | `https://horizon-testnet.stellar.org` |
| `STELLAR_NETWORK` | Network name | `testnet` |
| `ORACLE_PUBLIC_KEY` | Oracle's Stellar public key | — |

---

## Troubleshooting

### "Wallet not detected"
Install the Freighter browser extension and create a wallet.

### "Transaction simulation failed"
- Ensure your wallet has testnet XLM (use the friendbot)
- Check that the contract ID is correct in the config
- Verify network passphrase matches the network

### "Contract not found"
- Verify the contract is deployed on the correct network
- Check the contract ID in `config/index.ts`

### Build fails with ENOENT
```bash
# Clean and retry
rm -rf client/.next
cd client && bun run build
```

### Contract tests fail
```bash
cd contract && cargo clean && cargo test
```

---

## Future Improvements

- **LMSR Pricing** — Implement full Logarithmic Market Scoring Rule for more sophisticated odds
- **Multiple Oracles** — Support for decentralized oracle consensus (e.g., 3-of-5 multi-sig)
- **Conditional Markets** — Multi-outcome markets beyond binary YES/NO
- **Liquidity Mining** — Incentivize liquidity providers with platform tokens
- **Mobile App** — React Native or Flutter mobile client
- **Governance Token** — DAO-based protocol governance
- **Real-Time WebSocket** — Replace polling with WebSocket event streaming
- **Charting** — Historical odds movement charts with price action visualization
- **Social Features** — Comments, creator reputation, market categories

---

## License

MIT

---

## Support

For issues, feature requests, or contributions, please open an issue or pull request on the repository.
