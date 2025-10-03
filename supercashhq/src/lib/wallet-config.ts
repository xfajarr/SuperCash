// Wallet Adapter Configuration for Aptos
import { Network } from "@aptos-labs/ts-sdk";

export const NETWORK = Network.TESTNET;

export const walletAdapterConfig = {
  network: NETWORK,
  autoConnect: false, // Don't auto-connect to give users control
};
