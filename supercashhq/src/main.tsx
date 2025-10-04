import { createRoot } from "react-dom/client";
import { NetworkProvider, useNetwork } from "@/contexts/NetworkContext";
import { Providers } from "./components/Providers";
import "./index.css";

function AppWrapper() {
  return (
    <NetworkProvider>
      <AppWithProviders />
    </NetworkProvider>
  );
}

function AppWithProviders() {
  const { network } = useNetwork();
  return <Providers network={network} />;
}

createRoot(document.getElementById("root")!).render(
  <AppWrapper />
);