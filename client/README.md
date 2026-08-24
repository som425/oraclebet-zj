# OracleBet — Decentralized Prediction Markets on Stellar

OracleBet is a decentralized prediction market built on **Stellar Soroban**, where users predict binary (YES/NO) outcomes on real-world events using liquidity-based odds.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Next.js Frontend                    │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  Pages  │ │Components│ │  Hooks/Stores     │  │
│  │ (App    │ │(Navbar,  │ │ (TanStack Query,  │  │
│  │  Router)│ │MarketCard│ │  Zustand, Wallet) │  │
│  └────┬────┘ └────┬─────┘ └────────┬─────────┘  │
│       │           │                │             │
│  ┌────▼───────────▼────────────────▼─────────┐  │
│  │           Contract Hooks                   │  │
│  │   (ScVal wrappers → RPC calls via SDK)     │  │
│  └───────────────────┬───────────────────────┘  │
└──────────────────────┼─────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────┐
│            Stellar Soroban RPC                  │
│              (testnet/mainnet)                  │
└──────────────────────┬─────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────┐
│          OracleBet Smart Contract                │
│  ┌──────────────────────────────────────────┐   │
│  │  Market Management │ Trading │ Oracle     │   │
│  │  Disputes          │ Rewards               │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Features

### Smart Contract
- **Market Management**: Create, close, resolve, and finalize binary prediction markets
- **Trading**: Buy YES or NO shares using pool-ratio pricing
- **Liquidity Engine**: Dynamic odds based on pool ratios
- **Oracle Resolution**: Authorized oracle submits official results
- **Dispute Handling**: Users can dispute results within a configurable window
- **Reward Claims**: Winners claim payouts directly from the contract
- **Events**: Contract publishes events for all state changes

### Frontend
- **Wallet Integration**: Freighter wallet support with connection management
- **Market Browser**: Browse active, closed, and finalized markets
- **Market Details**: View odds, liquidity, positions, and trading interface
- **Create Market**: Form to create new prediction markets
- **Dashboard**: Wallet overview with portfolio stats
- **Transaction Tracking**: Pending/confirmed/failed status with explorer links
- **Event Feed**: Real-time contract event display
- **Responsive Design**: Dark mode UI with mobile support

## Tech Stack

- **Smart Contract**: Rust + Soroban SDK v25
- **Frontend**: Next.js 16 + TypeScript + Tailwind CSS
- **State Management**: TanStack Query + Zustand
- **Wallet**: Freighter API + Stellar SDK
- **UI**: Radix UI primitives + Lucide icons + Framer Motion
- **Forms**: React Hook Form + Zod

## Project Structure

```
├── contract/                      # Soroban smart contract
│   ├── Cargo.toml                 # Workspace root
│   ├── contracts/contract/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs             # Contract implementation
│   │       └── test.rs            # Tests (19 passing)
│   └── target/                    # Build output
│
├── client/                        # Next.js frontend
│   ├── src/
│   │   ├── app/                   # Pages
│   │   │   ├── page.tsx           # Home (market listing)
│   │   │   ├── layout.tsx         # Root layout
│   │   │   ├── dashboard/         # Wallet dashboard
│   │   │   ├── markets/[id]/      # Market details
│   │   │   ├── create/            # Create market
│   │   │   ├── activity/          # Event feed
│   │   │   └── transactions/      # Transaction history
│   │   ├── components/            # UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── WalletModal.tsx
│   │   │   ├── MarketCard.tsx
│   │   │   ├── OddsBar.tsx
│   │   │   ├── TransactionToast.tsx
│   │   │   └── Providers.tsx
│   │   ├── hooks/                 # React hooks
│   │   │   ├── contract.ts        # Contract interactions
│   │   │   └── useWallet.ts       # Wallet management
│   │   ├── store/index.ts         # Zustand store
│   │   ├── types/index.ts         # TypeScript types
│   │   ├── config/index.ts        # Configuration
│   │   └── lib/utils.ts           # Utilities
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

## Installation

### Prerequisites
- Rust 1.75+
- Node.js 18+
- Bun (recommended) or npm
- Stellar CLI (`npm install -g @stellar/stellar-cli`)

### Setup

```bash
# Install contract dependencies
cd contract
cargo build

# Install client dependencies
cd ../client
bun install
```

## Configuration

Copy `.env.example` to `.env` and update:

```env
CONTRACT_ADDRESS=YOUR_CONTRACT_ADDRESS_HERE
NETWORK_PASSPHRASE=Test SDF Network ; September 2015
RPC_URL=https://soroban-testnet.stellar.org
HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_NETWORK=testnet
ORACLE_PUBLIC_KEY=
```

Then update `src/config/index.ts` with the same contract address.

## Contract Deployment

```bash
cd contract

# Build WASM
stellar contract build

# Generate funded key
stellar keys generate dev --network testnet --fund

# Deploy
stellar contract deploy \
  --wasm target/wasm32v1-none/release/hello-world.wasm \
  --source-account dev \
  --network testnet
```

Save the returned contract ID.

### Initialize Contract

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account dev \
  --network testnet \
  -- \
  initialize \
  --oracle <ORACLE_PUBLIC_KEY>
```

### Create a Test Market

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source-account dev \
  --network testnet \
  -- \
  create_market \
  --creator <YOUR_PUBLIC_KEY> \
  --question "Will BTC reach 150k by Dec 2026?" \
  --description "Bitcoin price prediction" \
  --category "Crypto" \
  --close_time 1800000000 \
  --dispute_window 86400
```

## Running Locally

```bash
cd client

# Development server
bun run dev

# Production build
bun run build && bun start
```

Visit `http://localhost:3000`

## Testing

### Contract Tests
```bash
cd contract
cargo test
```

All 19 tests should pass.

### Frontend
```bash
cd client
bun run build    # TypeScript + build check
bun run lint     # ESLint
```

## Deployment

### Stellar Testnet
1. Deploy the Soroban contract (see Contract Deployment above)
2. Update `src/config/index.ts` with the contract address
3. Build and deploy the frontend

### Vercel
```bash
cd client
bun run build
npx vercel --prod
```

Set environment variables in Vercel dashboard.

## Smart Contract API

### State-Changing Functions
| Function | Auth | Description |
|---|---|---|
| `initialize(oracle)` | - | Set oracle address (one-time) |
| `create_market(...)` | creator | Create new prediction market |
| `buy_yes(user, market_id, amount)` | user | Bet on YES outcome |
| `buy_no(user, market_id, amount)` | user | Bet on NO outcome |
| `close_market(market_id)` | none | Close market after deadline |
| `resolve_market(oracle, market_id, result)` | oracle | Submit official result |
| `raise_dispute(caller, market_id)` | caller | Dispute a resolution |
| `resolve_dispute(oracle, market_id)` | oracle | Resolve a dispute |
| `finalize_market(market_id)` | none | Finalize after dispute window |
| `claim_reward(user, market_id)` | user | Claim winnings |

### Query Functions
| Function | Returns |
|---|---|
| `get_market(market_id)` | Market struct |
| `get_odds(market_id)` | (yes_prob_bps, no_prob_bps) |
| `get_position(user, market_id)` | (yes_bet, no_bet) |
| `get_payout(user, market_id)` | Estimated payout |
| `get_market_count()` | Total markets |

### Pricing Model
- YES probability = `yes_pool / (yes_pool + no_pool)` (in basis points)
- NO probability = `no_pool / (yes_pool + no_pool)`
- Payout = `user_bet * (yes_pool + no_pool) / winning_pool`
- Winners split the entire pool proportionally

## Events

The contract publishes events for all state changes:
- `market_created`
- `shares_purchased`
- `market_closed`
- `result_submitted`
- `dispute_raised`
- `dispute_resolved`
- `market_finalized`
- `reward_claimed`

## License

MIT
