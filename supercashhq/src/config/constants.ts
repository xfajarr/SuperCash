export const CONTRACT_ADDRESS = "0x504a0ae5e2d680cfd31b90a47f576088828483e1e4721efb0619ffa60ca94d61";
export const MONEY_STREAM_CONTRACT_ADDRESS = "0x504a0ae5e2d680cfd31b90a47f576088828483e1e4721efb0619ffa60ca94d61";

export const NETWORKS = {
  mainnet: {
    name: "mainnet",
    nodeUrl: "https://fullnode.mainnet.aptoslabs.com",
    indexUrl: "https://indexes.mainnet.aptoslabs.com",
  },
  testnet: {
    name: "testnet",
    nodeUrl: "https://fullnode.testnet.aptoslabs.com",
    indexUrl: "https://indexes.testnet.aptoslabs.com",
  },
};

export const TOKENS = {
  mainnet: {
    APT: { type: "0x1::aptos_coin::AptosCoin", decimals: 8, name: "Aptos", icon: "/Aptos_mark_BLK.svg" },
    USDC: {
      type: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::stablecoin::stablecoin",
      decimals: 6,
      name: "USD Coin",
      tokenSymbol: "USDC",
      icon: "/usd-coin-usdc-logo.svg",
      metadataAddress: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"
    },
    USDT: {
      type: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050::usdt::usdt",
      decimals: 6,
      name: "Tether USD",
      tokenSymbol: "USDT",
      icon: "/usdt_logo.svg",
      metadataAddress: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050"
    },
    PYUSD: {
      type: "0x0::asset::PYUSD",
      decimals: 6,
      name: "PayPal USD",
      tokenSymbol: "PYUSD",
      icon: "/paypal-usd-pyusd-logo.svg",
      metadataAddress: "0x0"
    },
  },
  testnet: {
    APT: { type: "0x1::aptos_coin::AptosCoin", decimals: 8, name: "Aptos", icon: "/Aptos_mark_BLK.svg" },
    USDC: {
      type: "address_USDC_TESTNET::stablecoin::stablecoin",
      decimals: 6,
      name: "USD Coin",
      tokenSymbol: "USDC",
      icon: "/usd-coin-usdc-logo.svg",
      metadataAddress: "address_USDC_TESTNET"
    },
    USDT: {
      type: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050::usdt::usdt",
      decimals: 6,
      name: "Tether USD",
      tokenSymbol: "USDT",
      icon: "/usdt_logo.svg",
      metadataAddress: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050"
    },
    PYUSD: {
      type: "0x0::asset::PYUSD",
      decimals: 6,
      name: "PayPal USD",
      tokenSymbol: "PYUSD",
      icon: "/paypal-usd-pyusd-logo.svg",
      metadataAddress: "0x0"
    },
  },
};

// Default to mainnet tokens
export const DEFAULT_NETWORK = "testnet";

// Helper function to get tokens for the current network
export const getTokensForNetwork = (network: keyof typeof TOKENS = DEFAULT_NETWORK) => {
  return TOKENS[network];
};

// Helper function to get network configuration
export const getNetworkConfig = (network: keyof typeof NETWORKS = DEFAULT_NETWORK) => {
  return NETWORKS[network];
};

// Helper function to get token list with icons for UI components
export const getTokenListForNetwork = (network: keyof typeof TOKENS = DEFAULT_NETWORK) => {
  const tokens = getTokensForNetwork(network);
  return Object.keys(tokens).map((symbol) => ({
    symbol,
    name: tokens[symbol].name,
    icon: tokens[symbol].icon || "/placeholder.svg",
  }));
};

// Backward compatibility - export current tokens as default
// Note: This will be overridden by the NetworkContext provider
export const CURRENT_TOKENS = getTokensForNetwork(DEFAULT_NETWORK);