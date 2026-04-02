# Frontend — Rootstream Kit

Next.js dashboard for **Rootstream** on **Rootstock Testnet (chain id 31)**. Connect a wallet, manage prepaid funds, create and monitor streams, execute or cancel payments, and browse history backed by **Envio GraphQL** plus on-chain reads and **`eth_getLogs`** where needed.

## Stack

| Layer | Technology |
|--------|------------|
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4** (`@import "tailwindcss"` in `src/styles/globals.css`) |
| Wallet | **wagmi v2**, **viem**, **RainbowKit** (injected connector) |
| Indexer API | **Apollo Client v4** → Envio Hasura-style GraphQL (`@apollo/client/react`) |
| Motion / UX | **Framer Motion**, **react-hot-toast** |
| Fonts | **Inter** (`@fontsource/inter`) |

## Requirements

- **Node.js** ≥ **20.9** (required by Next.js 16)
- **npm** (or another package manager; examples below use **npm**)

## Quick start

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local: contract address, RPC, Envio URL, deploy block (see below)
npm install
npm run dev
```

Open **http://localhost:3000**.

Restart the dev server after changing **`.env.local`** so `NEXT_PUBLIC_*` values reload.

## npm scripts

| Script | Command | When to use |
|--------|---------|-------------|
| **`dev`** | `next dev --webpack` | Local development with hot reload (**default**; webpack is steadier than Turbopack on low-RAM WSL). |
| **`dev:webpack`** | same as `dev` | Explicit webpack dev. |
| **`dev:turbo`** | `next dev --turbopack` | Faster dev if your machine has enough RAM. |
| **`preview`** | `next build && next start` | **Production mode locally** when dev keeps dying (see [WSL / OOM](#wsl-and-out-of-memory-oom)). |
| **`build`** | `next build` | Production build (CI / deploy). |
| **`start`** | `next start` | Serve an existing build (run **`build`** first). |
| **`lint`** | `eslint` | Lint the project. |

## Environment variables

All public vars use the **`NEXT_PUBLIC_`** prefix (embedded in the browser bundle). Copy **`.env.example`** → **`.env.local`** and adjust.

| Variable | Required | Default (if unset) | Purpose |
|----------|----------|--------------------|---------|
| **`NEXT_PUBLIC_ROOTSTREAM_ADDRESS`** | **Yes** for writes / contract reads | `""` | Rootstream contract address (checksum optional). |
| **`NEXT_PUBLIC_ENVIO_GRAPHQL_URL`** | Recommended | `http://127.0.0.1:8080/v1/graphql` | Envio indexer GraphQL HTTP endpoint. |
| **`NEXT_PUBLIC_RPC_URL`** | Recommended | `https://public-node.testnet.rsk.co` | JSON-RPC for wagmi/viem and **`eth_getLogs`** (see below). |
| **`NEXT_PUBLIC_ROOTSTREAM_DEPLOY_BLOCK`** | Optional | `7495313` | Block where your contract was deployed; used as the **from** block for payment log scans. |
| **`NEXT_PUBLIC_PAYMENT_LOG_LOOKBACK_BLOCKS`** | Optional | `250000` | How far back from the chain head to scan **`PaymentExecuted`** logs (dashboard / history). |
| **`NEXT_PUBLIC_CHAIN_ID`** | Optional | `31` | Documented for parity; the wired chain is **Rootstock testnet** in `src/services/chains.ts` (**id 31**). |

### Why `NEXT_PUBLIC_RPC_URL` matters

- **Wallet / reads** use this RPC via wagmi’s `http()` transport.
- **History** and parts of the **dashboard** call **`eth_getLogs`** for **`PaymentExecuted`**. Many **public** endpoints **disable or restrict** `eth_getLogs`; if history looks empty, switch to a provider that allows log queries (for example [Rootstock RPC](https://rpc.rootstock.io/) with an API key). The **`.env.example`** shows that pattern.

### Envio

Run the indexer from **`../envio/`** (see **`../envio/README.md`**) or point **`NEXT_PUBLIC_ENVIO_GRAPHQL_URL`** at a hosted endpoint. Without Envio, GraphQL-driven stats and tables may be empty or error; wallet actions can still hit the contract.

## App routes (App Router)

| Route | Purpose |
|-------|---------|
| **`/`** | Dashboard: analytics (Envio), streams, balances, execute payment |
| **`/create`** | Create a new stream |
| **`/streams`** | List / manage streams |
| **`/funds`** | Deposit prepaid RBTC |
| **`/history`** | Payment history (Envio + on-chain logs) |

Layout: **`AppShell`** (sidebar + top bar), wallet via RainbowKit **`ConnectButton`**, responsive navigation.

## Project layout (important paths)

| Path | Role |
|------|------|
| **`src/app/`** | App Router: `layout.tsx`, `providers.tsx`, `page.tsx` and route folders |
| **`src/app/providers.tsx`** | Wagmi, React Query, **ApolloProvider** (`@apollo/client/react`), RainbowKit, Toaster |
| **`src/components/layout/`** | `AppShell`, `Sidebar`, `Topbar` |
| **`src/components/ui/`** | `Card`, `Skeleton`, `EmptyState`, badges, icons |
| **`src/components/dashboard/`** | `StatCard` |
| **`src/hooks/`** | `useRootstream`, `useEnvioApollo`, `useUserStreamsOnChain`, `useChainPaymentLogs`, etc. |
| **`src/lib/apollo.ts`** | Apollo client + **HttpLink** to **`NEXT_PUBLIC_ENVIO_GRAPHQL_URL`** |
| **`src/lib/queries.ts`** | GraphQL documents (Analytics, streams, payments) |
| **`src/services/env.ts`** | Reads all **`NEXT_PUBLIC_*`** defaults |
| **`src/services/wagmi.ts`** | wagmi config (single chain + RPC) |
| **`src/services/chains.ts`** | **Rootstock testnet** `defineChain` |
| **`src/services/rootstreamAbi.ts`** | Contract ABI for viem/wagmi |
| **`src/styles/globals.css`** | Tailwind v4 entry + theme tokens |

## Legacy Pages Router

- **`src/pages/_app.tsx`** — Still wraps **Pages** routes with **`Providers`** (mostly redundant with App Router layout; safe to keep for **`pages/api`**).
- **`src/pages/api/hello.ts`** — Sample API route (**`/api/hello`**).

New UI lives under **`src/app/`**; do not duplicate routes in **`pages/`**.

## Data flow (short)

1. **Contract** — Reads/writes through **wagmi** + **`ROOTSTREAM_ABI`** and **`NEXT_PUBLIC_ROOTSTREAM_ADDRESS`**.
2. **Indexer** — **Apollo** runs queries from **`src/lib/queries.ts`** against Envio’s schema (`Stream`, `Payment`, `User`, `Analytics`, …).
3. **Payment logs** — **`useChainPaymentLogs`** uses **viem** `getLogs` over **`NEXT_PUBLIC_RPC_URL`** inside the lookback window, merged with Envio for **History** / **Paid** semantics.

## Production build

```bash
npm run build
npm run start
```

Set the same **`NEXT_PUBLIC_*`** values in your hosting provider’s environment. For **Vercel** (or similar), define env vars in the project settings and redeploy.

## WSL and out-of-memory (OOM)

On **WSL2**, **`npm run dev`** can be **killed by the Linux OOM killer** during the first compile (`next-server` disappears right after `○ Compiling / ...`). Check with:

```bash
dmesg | tail -20
```

If you see **`Out of memory: Killed process ... next-server`**, either:

1. **Raise WSL memory** — On Windows, edit **`%UserProfile%\.wslconfig`**:

   ```ini
   [wsl2]
   memory=8GB
   ```

   Then **`wsl --shutdown`** from PowerShell and reopen WSL.

2. **Use production mode locally** (no HMR, lower steady RAM):

   ```bash
   npm run preview
   ```

3. **Try Turbopack only if RAM allows**: `npm run dev:turbo`.

4. **Reduce other consumers** — Extra **Node**, **Postgres**, **Envio**, or **duplicate dev servers** compete for the same WSL cap.

## Configuration notes

- **`next.config.ts`** enables **`experimental.webpackMemoryOptimizations`** to ease **`next build`** memory use; it does not remove the need for enough RAM in dev.
- **Apollo v4**: import **`ApolloProvider`** and **`useQuery`** from **`@apollo/client/react`**, not **`@apollo/client`** alone.

## Related packages in this repo

- **`../contracts/`** — Solidity + Foundry deploy (address + deploy block for `.env.local`)
- **`../envio/`** — HyperIndex + GraphQL
- **`../gelato/`** — Web3 Function for automated `executePayment`

A root **README** can summarize the full stack end-to-end.
