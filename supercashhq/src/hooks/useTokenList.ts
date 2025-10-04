import { useNetwork } from "@/contexts/NetworkContext";
import { getTokenListForNetwork } from "@/config/constants";

export const useTokenList = () => {
  const { network } = useNetwork();
  return getTokenListForNetwork(network);
};