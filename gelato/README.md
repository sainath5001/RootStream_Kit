# Gelato — Rootstream Web3 Function

This package is a **Gelato Web3 Function** that periodically checks **Rootstream** streams and, when due, returns calldata so Gelato can submit **`executePayment(streamId)`** on **Rootstock Testnet (chain id 31)**.

Deploy the contract first (see **`../contracts/README.md`**), then configure **`rootstream`** and **`fromBlock`** here to match that deployment.

## How it runs

1. **You** create an **Automate** task on [Gelato](https://app.gelato.network/) for this Web3 Function on **Rootstock Testnet (31)** with a time cadence (for example every few minutes).
2. **Gelato** calls `onRun`. The function returns either **`canExec: false`** (no transaction) or **`canExec: true`** with one or more `{ to, data }` calls.
3. **Executors** broadcast those transactions to your **Rootstream** address. The contract still enforces rules on-chain; the function only filters obvious non-starters off-chain.

## Layout

| Path | Purpose |
|------|---------|
| `web3-functions/rootstream-payments/index.ts` | Web3 Function entrypoint (`Web3Function.onRun`) |
| `web3-functions/rootstream-payments/schema.json` | Runtime limits + **typed `userArgs`** for Gelato |
| `web3-functions/rootstream-payments/userArgs.json` | Values used by **`w3f test`**; template for deployment args |
| `config/user-args.example.json` | Example args you can copy into `userArgs.json` or the Gelato UI |

## Discovery logic (short)

By default the function tries to find stream IDs from **`StreamCreated`** logs via **`eth_getLogs`** from **`fromBlock`** upward (chunked, with limits).

If the RPC **does not support `eth_getLogs`**, returns **temporary errors**, or you set **`preferScan: true`**, it **falls back** to scanning stream IDs in order using **`nextStreamId()`** and a **persistent cursor** in Gelato storage (`scanCursor:…`). That path works on restricted public nodes but is less efficient for many streams.

For each candidate ID it checks: stream **active**, **interval elapsed** (using latest block timestamp), sender **balance ≥ amountPerInterval**. Up to **`maxExecutionsPerRun`** due streams are batched into **`callData`**.

## Requirements

- **Node.js** (LTS recommended)
- **npm** and this repo’s `gelato/` dependencies

## Setup

```bash
cd gelato
cp .env.example .env
npm install
npm run build
```

Edit **`web3-functions/rootstream-payments/userArgs.json`** (or copy from `config/user-args.example.json`):

- **`rootstream`** — address from your Foundry deploy  
- **`fromBlock`** — deployment block (or first block you care about) for log scanning  
- Set **`preferScan: true`** if your RPC blocks **`eth_getLogs`** (common on some free Rootstock endpoints)

## Local test

```bash
npm run test:w3f
```

This uses **`dotenv-cli`** to load **`.env`**. The Gelato CLI alone does **not** read `.env`.

**`PROVIDER_URLS`** must be a Rootstock testnet JSON-RPC URL (chain **31**), comma-separated if you list several, typically **no quotes** in `.env`:

```env
PROVIDER_URLS=https://public-node.testnet.rsk.co
```

### WSL2 / “could not detect network”

If **`curl`** to the RPC works but **`w3f test`** fails with **could not detect network**, Node may be preferring **IPv6** DNS on **WSL2**. The npm scripts set:

`NODE_OPTIONS=--dns-result-order=ipv4first`

Use **`npm run test:w3f`** / **`npm run test:w3f:public-rpc`**, or export the same **`NODE_OPTIONS`** when invoking **`w3f`** manually.

Quick RPC check:

```bash
curl -sS -m 20 -X POST https://public-node.testnet.rsk.co \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
```

You should see **`0x1f`** (31). Try another testnet URL if needed (for example from [Rootstock RPC](https://rpc.rootstock.io/)).

## Deploy to Gelato

```bash
npm run build
npx w3f deploy web3-functions/rootstream-payments/index.ts
```

Follow the CLI prompts, then in the **Gelato app** create an **Automate Web3 Function** task: network **Rootstock testnet**, paste **user args** with the same keys as **`schema.json`**, and fund **1Balance** / the task budget so executions can run.

## `userArgs` reference

| Key | Type | Role |
|-----|------|------|
| `rootstream` | string | Deployed **Rootstream** contract address |
| `fromBlock` | number | First block for **`StreamCreated`** log scan (≤ deploy block) |
| `logChunkSize` | number | Block window per **`eth_getLogs`** request (stay within RPC limits) |
| `maxGetLogsChunks` | number | Max log chunks per run; increase if history is deep |
| `maxStreamIdsToCheck` | number | Max stream IDs to evaluate after discovery |
| `maxExecutionsPerRun` | number | Max **`executePayment`** calls in one Gelato batch |
| `preferScan` | boolean | If **true**, skip logs and use **scan** mode with storage cursor |
| `scanBatchSize` | number | How many IDs to advance per run in **scan** mode |
| `startStreamId` | number | Initial lower bound for the scan cursor when storage is empty |

## `npm audit` and `elliptic` (ethers v5)

After **`package.json` overrides** (`tar`, `esbuild`, `dockerode`, `tar-fs`), **`npm audit`** may still report low issues from **[GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84)** on **`elliptic`**, pulled in via **`@gelatonetwork/web3-functions-sdk`** → **`@ethersproject/*`**.

**Do not run `npm audit fix --force` here** — npm may suggest downgrading **`@ethersproject/abi`**, which can break **`w3f`**.

Practical options: accept residual lows until Gelato/ethers v5 updates, or gate CI with e.g. **`npm audit --audit-level=moderate`**.

## Security notes

- Only streams that look **due** and **funded** off-chain get calldata; others are skipped to reduce wasted gas. The contract is still authoritative.
- Races remain possible (for example a user spends balance in the same block); the on-chain call may still revert, which Gelato handles as a failed execution.

## Related packages in this repo

- **`../contracts/`** — Rootstream Solidity + Foundry deploy  
- **`../envio/`** — indexer for events (optional for UI)  
- **`../frontend/`** — dashboard  

A root **README** summarizes the full stack when available.
