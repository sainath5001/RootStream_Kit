import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Provider as UrqlProvider } from "urql";
import { Toaster } from "react-hot-toast";
import { useMemo, useState } from "react";
import { wagmiConfig } from "@/services/wagmi";
import { makeEnvioClient } from "@/services/envioClient";

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(() => new QueryClient());
  const urqlClient = useMemo(() => makeEnvioClient(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <UrqlProvider value={urqlClient}>
          <Component {...pageProps} />
          <Toaster position="top-right" />
        </UrqlProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
