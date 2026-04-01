export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function getPublicEnv() {
  const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "31");
  const rootstreamAddress = process.env.NEXT_PUBLIC_ROOTSTREAM_ADDRESS ?? "";
  const envioGraphqlUrl =
    process.env.NEXT_PUBLIC_ENVIO_GRAPHQL_URL ?? "http://127.0.0.1:8080/v1/graphql";
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://public-node.testnet.rsk.co";
  const rootstreamDeployBlock = BigInt(process.env.NEXT_PUBLIC_ROOTSTREAM_DEPLOY_BLOCK ?? "7495313");
  const paymentLogLookbackBlocks = BigInt(process.env.NEXT_PUBLIC_PAYMENT_LOG_LOOKBACK_BLOCKS ?? "250000");

  return {
    chainId,
    rootstreamAddress,
    envioGraphqlUrl,
    rpcUrl,
    rootstreamDeployBlock,
    paymentLogLookbackBlocks,
  } as const;
}

