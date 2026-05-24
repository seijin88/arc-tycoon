import { defineChain } from "viem";

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
});

export const addresses = {
  factory: import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}` | undefined,
  chips: import.meta.env.VITE_CHIP_ADDRESS as `0x${string}` | undefined,
  faucet: import.meta.env.VITE_FAUCET_ADDRESS as `0x${string}` | undefined,
};

export const contractsConfigured = Boolean(addresses.factory && addresses.chips);
