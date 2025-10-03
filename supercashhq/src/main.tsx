import { AptosWalletAdapterProvider, type AvailableWallets } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { createRoot } from "react-dom/client";
import { NetworkProvider, useNetwork } from "@/contexts/NetworkContext";
import App from "./App.tsx";
import "./index.css";

function Providers() {
  const { network } = useNetwork();
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

createRoot(document.getElementById("root")!).render(
  <NetworkProvider>
    <Providers />
  </NetworkProvider>
);