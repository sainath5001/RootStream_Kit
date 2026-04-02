"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { Toaster } from "react-hot-toast";
import { ApolloProvider } from "@apollo/client/react";

import { wagmiConfig } from "@/services/wagmi";
import { apolloClient } from "@/lib/apollo";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          <RainbowKitProvider
            theme={darkTheme({
              accentColor: "#FF6B00",
              accentColorForeground: "#0B0B0B",
              borderRadius: "large",
            })}
          >
            {children}
            <Toaster position="top-right" />
          </RainbowKitProvider>
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

