// Custom hook for Aptos wallet integration
import { useWallet, WalletName } from "@aptos-labs/wallet-adapter-react";
import { toast } from "sonner";

export interface UseAptosWalletReturn {
  account: any;
  connected: boolean;
  connecting: boolean;
  wallet: any;
  wallets: any[];
  connect: (walletName?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmitTransaction: (transaction: any) => Promise<any>;
  address: string | undefined;
}

export function useAptosWallet(): UseAptosWalletReturn {
  const {
    account,
    connected,
    connecting,
    wallet,
    wallets,
    connect: walletConnect,
    disconnect: walletDisconnect,
    signAndSubmitTransaction,
  } = useWallet();

  const connect = async (walletName?: string) => {
    try {
      // If specific wallet name provided, connect to it
      if (walletName) {
        await walletConnect(walletName as WalletName);
      } else {
        // Try to connect to Petra by default, or first available wallet
        const petraWallet = wallets?.find((w) => w.name === "Petra");
        const firstWallet = wallets?.[0];

        if (petraWallet) {
          await walletConnect(petraWallet.name as WalletName);
        } else if (firstWallet) {
          await walletConnect(firstWallet.name as WalletName);
        } else {
          throw new Error("No wallet available");
        }
      }
      toast.success("Wallet connected successfully!");
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast.error(error?.message || "Failed to connect wallet");
      throw error; // Re-throw to prevent silent failures
    }
  };

  const disconnect = async () => {
    try {
      await walletDisconnect();
      toast.success("Wallet disconnected");
    } catch (error: any) {
      console.error("Wallet disconnection error:", error);
      toast.error("Failed to disconnect wallet");
    }
  };

  // Safely extract address - handle both string and object formats
  let walletAddress: string | undefined;
  try {
    if (account) {
      // Check if address is a string or needs to be converted
      walletAddress = typeof account.address === 'string'
        ? account.address
        : account.address?.toString();
    }
  } catch (e) {
    console.error("Error extracting wallet address:", e);
    walletAddress = undefined;
  }

  return {
    account,
    connected: connected || false,
    connecting: connecting || false,
    wallet,
    wallets: wallets || [],
    connect,
    disconnect,
    signAndSubmitTransaction,
    address: walletAddress,
  };
}
