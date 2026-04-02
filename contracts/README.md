# Contracts — Rootstream

Solidity contracts for **Rootstream**: prepaid **native-token** (RBTC on Rootstock) recurring payment streams. Senders fund an on-contract balance; anyone may call `executePayment` when an interval has passed, which moves one period’s amount to the recipient. This design fits **Gelato Web3 Functions** or manual execution.

## Contents

| Path | Purpose |
|------|---------|
| `src/Rootstream.sol` | Main contract |
| `script/DeployRootstream.s.sol` | Foundry script to deploy `Rootstream` |
| `test/Rootstream.t.sol` | Unit tests (streams, deposits, reentrancy, failed transfers) |

## How it works

1. **Balance** — The sender deposits native currency via `depositFunds()` or a plain `receive()` transfer. Balances are tracked per address in `balances[user]`.

2. **Stream** — `createStream(recipient, amountPerInterval, interval)` creates a stream. The sender must have enough prepaid balance when `executePayment` runs (not necessarily at creation time). `lastExecuted` is initialized to `block.timestamp`, so the first payment is due after one full `interval`.

3. **Execution** — `executePayment(streamId)` is **permissionless**: it checks the stream is active, the interval has elapsed, and the sender’s balance covers `amountPerInterval`. It updates `lastExecuted`, debits the sender’s balance, and sends native value to the recipient. **Gelato or any EOA** can call it.

4. **Cancellation** — Only the stream sender can `cancelStream(streamId)`. Active streams are counted per sender via `activeStreamCount`.

5. **Withdrawal** — `withdrawRemainingBalance(streamId)` returns the sender’s remaining prepaid balance **only if** all their streams are cancelled (`activeStreamCount[sender] == 0`). The given `streamId` must be one of the sender’s **inactive** streams (authorization hook).

## Events (for indexing)

Indexers (for example Envio) typically subscribe to:

- `StreamCreated` — new stream and parameters  
- `PaymentExecuted` — amount and timestamp per payout  
- `StreamCancelled` — stream stopped  
- `FundsDeposited` / `FundsWithdrawn` — balance changes  

## Requirements

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`forge`, `cast`, optional `anvil`)

## Setup

From this directory:

```bash
# If submodules are missing:
git submodule update --init --recursive

cp .env.example .env
# Edit .env: PRIVATE_KEY (testnet-only key), ROOTSTOCK_TESTNET_RPC_URL
```

`foundry.toml` defines an RPC alias `rootstock-testnet` that reads `ROOTSTOCK_TESTNET_RPC_URL`. Rootstock **Testnet** chain id is **31**.

## Build and test

```bash
forge build
forge test
forge fmt          # optional: format Solidity
```

## Deploy (Rootstock Testnet)

Load environment variables (example for bash):

```bash
set -a && source .env && set +a
```

Deploy (broadcasts one transaction). **`--legacy`** matches what Rootstock testnet accepts in practice; successful kit deploys used legacy-type txs (type `0x0`).

```bash
forge script script/DeployRootstream.s.sol:DeployRootstream \
  --rpc-url rootstock-testnet \
  --broadcast \
  --legacy \
  -vvvv
```

To **simulate only** (no chain transaction), run the same command **without** `--broadcast`.

Artifacts and transaction metadata are written under `broadcast/` and `cache/`. After deployment, point the **frontend**, **Gelato** task, and **Envio** config at the new contract address and deployment block.

## Security and operational notes

- **Recipient payouts** use a low-level `call` with native value. If the recipient **reverts** or is a contract that rejects ETH, `executePayment` reverts and no partial state is committed for that call (balance and `lastExecuted` are updated in the same flow before the transfer in the current implementation — see `Rootstream.sol` for ordering). Operators should use recipients that accept native transfers.
- **`executePayment` is public** by design for automation; only timing, balance, and stream state gate payouts.
- Use a **dedicated testnet key** in `.env`; never commit `.env` or real mainnet keys.

## Related packages in this repo

- **gelato/** — Web3 Function to call `executePayment` on due streams  
- **envio/** — HyperIndex schema and indexer for contract events  
- **frontend/** — Dashboard wired to the contract and Envio GraphQL  

A top-level README ties the stack together once those sections are documented.
