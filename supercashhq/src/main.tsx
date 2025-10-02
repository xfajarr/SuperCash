import { AptosWalletAdapterProvider, type AvailableWallets } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const SUPPORTED_WALLETS: AvailableWallets[] = [
  "Petra",
  "Pontem Wallet",
  "Nightly",
  "OKX Wallet",
  "Bitget Wallet",
  "Backpack",
  "MSafe",
];

createRoot(document.getElementById("root")!).render(
  <AptosWalletAdapterProvider
    optInWallets={SUPPORTED_WALLETS}
    autoConnect
    dappConfig={{ network: Network.TESTNET }}
    onError={(error) => console.error("Aptos wallet error", error)}
  >
    <App />
  </AptosWalletAdapterProvider>
);
