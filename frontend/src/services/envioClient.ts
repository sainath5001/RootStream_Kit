import { cacheExchange, createClient, fetchExchange } from "urql";
import { getPublicEnv } from "@/services/env";

export function makeEnvioClient() {
  const { envioGraphqlUrl } = getPublicEnv();
  return createClient({
    url: envioGraphqlUrl,
    exchanges: [cacheExchange, fetchExchange],
    requestPolicy: "cache-and-network",
    // Hasura/Envio GraphQL does not support Apollo persisted queries.
    // Force plain POST requests.
    preferGetMethod: false,
    fetchOptions: () => ({
      method: "POST",
      headers: { "content-type": "application/json" },
    }),
  });
}

