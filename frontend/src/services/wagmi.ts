import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { rootstockTestnet } from "@/services/chains";

export const wagmiConfig = createConfig({
  chains: [rootstockTestnet],
  connectors: [injected()],
  transports: {
    [rootstockTestnet.id]: http(),
  },
});

