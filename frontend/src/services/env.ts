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

  return { chainId, rootstreamAddress, envioGraphqlUrl } as const;
}

