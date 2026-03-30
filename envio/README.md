# Envio HyperIndex — Rootstream

Indexes Rootstream contract events on **Rootstock Testnet (chain 31)** and exposes them via GraphQL.

## Indexed events

- `StreamCreated`
- `PaymentExecuted`
- `StreamCancelled`
- `FundsDeposited`
- `FundsWithdrawn`

## Entities

- `Stream` (core stream state + aggregates)
- `Payment` (one row per execution)
- `User` (aggregates: deposits, withdrawals, paid sent/received, derived balance)
- `Analytics` (global aggregates)

## Configure

The contract address is set in `config.yaml` and can be overridden via env var:

```bash
export ROOTSTREAM_ADDRESS=0x067FDf1C8e778fDf1bEFa1DB6debD89491EA9B45
```

## Run locally

```bash
cd envio
pnpm install
pnpm envio codegen
pnpm envio dev
```

Then use the Envio GraphQL endpoint (local dev prints the URL) and run queries from `queries.graphql`.

## Notes on totals

- `Stream.totalPaid` and `Stream.executionCount` are updated from `PaymentExecuted`.
- `User.derivedBalance` is a best-effort derived figure updated by:
  - `+amount` on `FundsDeposited`
  - `-amount` on `PaymentExecuted` (sender)
  - `-amount` on `FundsWithdrawn`

The on-chain source of truth remains `Rootstream.balances(user)`.
