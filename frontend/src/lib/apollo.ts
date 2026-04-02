import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { getPublicEnv } from "@/services/env";

const { envioGraphqlUrl } = getPublicEnv();

export const apolloClient = new ApolloClient({
  link: new HttpLink({
    uri: envioGraphqlUrl,
    fetchOptions: { method: "POST" },
  }),
  cache: new InMemoryCache(),
});

