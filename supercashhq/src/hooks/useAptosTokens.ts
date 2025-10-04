import { useNetwork } from "@/contexts/NetworkContext";

export const useAptosTokens = () => {
  const { tokens } = useNetwork();
  return tokens;
};