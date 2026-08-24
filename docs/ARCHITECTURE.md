# OracleBet Architecture

OracleBet is a Soroban prediction-market frontend and contract workspace.

## Runtime flow

1. Next.js renders the market terminal and responsive trading surfaces.
2. React Query reads contract state through the Soroban RPC client.
3. Queries refresh on a short interval so odds and market lifecycle state remain current.
4. Wallet actions build and sign Soroban transactions through the connected wallet.
5. Contract lifecycle methods emit state transitions that can be indexed by a future event service.

## Delivery workflow

- Frontend: `client`, validated with `pnpm run build`.
- Contract: `contract`, formatted and tested with Cargo in CI.
- CI: `.github/workflows/ci.yml` runs frontend build and Rust format/test checks on pushes and pull requests.
- Deployment: publish the `client` app to Vercel and configure the contract ID, RPC URL, network passphrase, and token asset in the project environment.

## Realtime boundary

The current client uses polling intentionally. The event feed is designed behind the contract client boundary so a Soroban event indexer can replace polling without changing market components.

## Production checklist

- Set a deployed contract ID and verify the configured network.
- Run contract tests and frontend build in CI.
- Add an indexed event endpoint for high-volume activity feeds.
- Keep wallet signing client-side and validate all contract inputs on-chain.
