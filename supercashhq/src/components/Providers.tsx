import { AptosWalletAdapterProvider, type AvailableWallets } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import App from "../App.tsx";

const SUPPORTED_WALLETS: AvailableWallets[] = [
  "Continue with Google",
  "Petra",
  "Pontem Wallet",
  "Nightly",
  "OKX Wallet",
  "Bitget Wallet",
  "Backpack",
  "MSafe",
];

interface ProvidersProps {
  network: string;
}

export function Providers({ network }: ProvidersProps) {
  // Convert our network type to the Aptos SDK Network type
  const aptosNetwork = network === "mainnet" ? Network.MAINNET : Network.TESTNET;
  
  return (
    <AptosWalletAdapterProvider
      optInWallets={SUPPORTED_WALLETS}
      autoConnect
      dappConfig={{ network: aptosNetwork }}
      onError={(error) => console.error("Aptos wallet error:", error)}
    >
      <App />
    </AptosWalletAdapterProvider>
  );
}