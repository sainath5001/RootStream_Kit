import { createConfig, http } from "wagmi";
import { injected } from "@wagmi/core";
import { rootstockTestnet } from "@/services/chains";
import { getPublicEnv } from "@/services/env";

const { rpcUrl } = getPublicEnv();

export const wagmiConfig = createConfig({
  chains: [rootstockTestnet],
  connectors: [injected()],
  transports: {
    [rootstockTestnet.id]: http(rpcUrl),
  },
});

