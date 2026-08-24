/**
 * OracleBet Deployment Script
 *
 * Usage:
 *   bun run scripts/deploy.ts
 *
 * Prerequisites:
 *   - stellar CLI installed (https://github.com/stellar/stellar-cli)
 *   - Funded testnet key (run `stellar keys generate dev --network testnet --fund`)
 */

const STEPS = [
  {
    title: "Build Contract",
    cmd: "cd ../contract && stellar contract build",
    desc: "Compiles the Soroban contract to WebAssembly",
  },
  {
    title: "Deploy Contract",
    cmd: "stellar contract deploy --wasm target/wasm32v1-none/release/oraclebet.wasm --source-account dev --network testnet",
    desc: "Deploys the compiled WASM to Stellar Testnet\n     Copy the returned contract ID (C... format)",
  },
  {
    title: "Configure Client",
    cmd: "Update src/config/index.ts with the contract ID",
    desc: "Set contractId to the deployed address",
  },
  {
    title: "Initialize Oracle",
    cmd: 'stellar contract invoke --id <CONTRACT_ID> --source-account dev --network testnet -- initialize --oracle <ORACLE_PUBKEY>',
    desc: "Sets the oracle address that will resolve markets\n     Replace <CONTRACT_ID> and <ORACLE_PUBKEY> with actual values",
  },
  {
    title: "Verify Deployment",
    cmd: 'stellar contract invoke --id <CONTRACT_ID> --source-account dev --network testnet -- get_market_count',
    desc: "Should return 0 if contract is initialized correctly",
  },
];

console.log("\n🚀 OracleBet - Deployment Guide\n");
console.log("=".repeat(50));

STEPS.forEach((step, i) => {
  console.log(`\nStep ${i + 1}: ${step.title}`);
  console.log("-".repeat(step.title.length + 6));
  console.log(`  Command: ${step.cmd}`);
  console.log(`  Info:    ${step.desc}\n`);
});

console.log("=".repeat(50));
console.log("\n📋 Post-Deployment Checklist:\n");
console.log("  1. ✓ Contract deployed and initialized");
console.log("  2. ✓ CONTRACT_ADDRESS set in .env and config/index.ts");
console.log("  3. ✓ ORACLE_PUBLIC_KEY set in .env");
console.log("  4. ✓ Run 'bun run build' to verify the client builds");
console.log("  5. ✓ Run 'bun run dev' to start the development server\n");
