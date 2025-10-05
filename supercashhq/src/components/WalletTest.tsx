// Simple wallet test component to debug connection
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { Card } from "./ui/card";

export function WalletTest() {
  const { connected, address, account, wallet } = useAptosWallet();

  return (
    <Card className="p-4 m-4">
      <h3 className="font-bold mb-2">Wallet Debug Info:</h3>
      <div className="space-y-2 text-sm">
        <p>Connected: {connected ? "✅ Yes" : "❌ No"}</p>
        <p>Address: {address || "N/A"}</p>
        <p>Wallet Name: {wallet?.name || "N/A"}</p>
        <p>Account: {account ? "✅ Exists" : "❌ None"}</p>
      </div>
    </Card>
  );
}
