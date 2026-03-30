# Gelato Web3 Functions — Rootstream

Automates `executePayment(streamId)` on **Rootstream** when a stream is **active**, **interval elapsed**, and the sender **has enough prepaid balance**.

## How Gelato runs this

1. **Trigger:** You create an **Automate** task on [Gelato](https://app.gelato.network/) targeting this Web3 Function with a **time interval** (e.g. every 5 minutes) on **Rootstock Testnet (31)**.
2. **Execution:** Gelato’s runtime invokes `onRun`, which returns either `canExec: false` (no tx) or `canExec: true` with one or more `{ to, data }` payloads.
3. **On-chain:** Gelato’s executor sends those txs to your **Rootstream** contract. Invalid streams are skipped off-chain; the contract still enforces all rules on execution.

## Layout

- `web3-functions/rootstream-payments/index.ts` — function logic  
- `web3-functions/rootstream-payments/schema.json` — runtime + **typed** `userArgs`  
- `web3-functions/rootstream-payments/userArgs.json` — values for local `w3f test` / template for IPFS upload  
- `config/user-args.example.json` — copy/reference for deployment args  

## Local test

```bash
cd gelato
cp .env.example .env
npm install
# Edit web3-functions/rootstream-payments/userArgs.json (rootstream + fromBlock)
npm run test:w3f
```

`npm run test:w3f` loads **`.env`** via `dotenv-cli` (the Gelato CLI itself does **not** read `.env`). `PROVIDER_URLS` must be a **chain-31** JSON-RPC URL, no spaces, typically **no quotes** in `.env`:

```env
PROVIDER_URLS=https://public-node.testnet.rsk.co
```

If you see **`could not detect network`** while **`curl`** to the same RPC works, you are often hitting **Node’s IPv6-first DNS** on **WSL2**: Node tries IPv6 first, the path fails, and ethers never gets `eth_chainId`. The npm scripts already set:

`NODE_OPTIONS=--dns-result-order=ipv4first`

If you run `w3f` by hand, use the same flag or run `npm run test:w3f` / `test:w3f:public-rpc`.

Other checks:

1. Confirm RPC:  
   `curl -sS -m 20 -X POST https://public-node.testnet.rsk.co -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'`
2. `npm run test:w3f:public-rpc` (uses public node + IPv4-first).
3. Try another Rootstock testnet URL in `.env` (e.g. from [rpc.rootstock.io](https://rpc.rootstock.io/)).

## Deploy function to Gelato

```bash
npx w3f deploy web3-functions/rootstream-payments/index.ts
```

Follow CLI prompts, then create an **Automate Web3 Function** task in the Gelato app: set **network** Rootstock testnet, paste **user args** (same keys as `schema.json`), and fund the **1Balance** / task budget.

## Tuning `userArgs`

| Key | Role |
|-----|------|
| `rootstream` | Rootstream proxy/impl address |
| `fromBlock` | First block for `StreamCreated` log scan (≤ deployment block) |
| `logChunkSize` | `eth_getLogs` window (RPC limit–safe) |
| `maxGetLogsChunks` | Cap RPC calls per run; raise if history is deep |
| `maxStreamIdsToCheck` | Max distinct stream IDs to read after log discovery |
| `maxExecutionsPerRun` | Max `executePayment` txs in one Gelato batch |

## npm audit and the remaining `elliptic` findings

After the `overrides` in `package.json` (newer `tar`, `esbuild`, `dockerode`, `tar-fs`), **`npm audit` may still report ~10 low issues**, all from the same advisory: [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) on **`elliptic`**, pulled in by **`@ethersproject/signing-key`** → **`@ethersproject/*`** → **`@gelatonetwork/web3-functions-sdk`**.

There is **no patched `elliptic` release** on npm that clears that advisory yet, and **Gelato’s SDK is built on ethers v5** (`@ethersproject/*`). Until Gelato (or ethers v5) moves off that stack, **you cannot honestly get “0 vulnerabilities” in `npm audit`** without removing the SDK.

**Do not run `npm audit fix --force` here.** npm may suggest installing old `@ethersproject/abi@5.0.9`, which is a **breaking / wrong downgrade** and can break `w3f` builds.

**Practical options:**

1. **Accept the residual low findings** and re-run `npm audit` occasionally; upgrade `@gelatonetwork/web3-functions-sdk` when Gelato ships releases that tighten dependencies.
2. **CI policy:** if you only want to fail on serious issues, use e.g. `npm audit --audit-level=moderate` (or `high`). That is a product choice, not a security magic wand.
3. **Risk context:** this path is mainly **transitive**; your Web3 Function logic does not need local **secp256k1 signing** for `executePayment` simulation, but the dependency is still present for the SDK/ethers toolchain.

## Security notes

- Only **due**, **active** streams with **sufficient** `balances(sender)` get calldata; others are skipped to limit reverts.
- The contract remains the source of truth; failed simulations are avoided when possible, not guaranteed in all edge cases (e.g. race with a user tx in the same block).
