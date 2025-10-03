import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NETWORKS, DEFAULT_NETWORK, getNetworkConfig, getTokensForNetwork } from '@/config/constants';

type Network = keyof typeof NETWORKS;

interface NetworkContextType {
  network: Network;
  setNetwork: (network: Network) => void;
  networkConfig: ReturnType<typeof getNetworkConfig>;
  tokens: ReturnType<typeof getTokensForNetwork>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [network, setNetworkState] = useState<Network>(DEFAULT_NETWORK);

  // Load network from localStorage on mount
  useEffect(() => {
    const savedNetwork = localStorage.getItem('aptos-network') as Network;
    if (savedNetwork && NETWORKS[savedNetwork]) {
      setNetworkState(savedNetwork);
    }
  }, []);

  // Save network to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('aptos-network', network);
  }, [network]);

  const setNetwork = (newNetwork: Network) => {
    if (NETWORKS[newNetwork]) {
      setNetworkState(newNetwork);
    }
  };

  const networkConfig = getNetworkConfig(network);
  const tokens = getTokensForNetwork(network);

  const value: NetworkContextType = {
    network,
    setNetwork,
    networkConfig,
    tokens,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};