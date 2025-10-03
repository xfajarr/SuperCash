export const CONTRACT_ADDRESS = "0xe012406f23b3c3101a8c3d506e8b6df0e6d69598a526e78827be2d42e5d10dc9";

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
    USDC: { type: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::asset::USDC", decimals: 6, name: "USD Coin", tokenSymbol: "USDC", icon: "/usd-coin-usdc-logo.svg" },
    USDT: { type: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050::usdt::usdt", decimals: 6, name: "Tether USD", tokenSymbol: "USDT", icon: "/usdt_logo.svg" },
    PYUSD: { type: "0x0::asset::PYUSD", decimals: 6, name: "PayPal USD", tokenSymbol: "PYUSD", icon: "/paypal-usd-pyusd-logo.svg" },
  },
  testnet: {
    APT: { type: "0x1::aptos_coin::AptosCoin", decimals: 8, name: "Aptos", icon: "/Aptos_mark_BLK.svg" },
    USDC: { type: "0xe012406f23b3c3101a8c3d506e8b6df0e6d69598a526e78827be2d42e5d10dc9::mock_usdc::MockUSDCToken", decimals: 6, name: "USD Coin", tokenSymbol: "USDC", icon: "/usd-coin-usdc-logo.svg" },
    USDT: { type: "0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::asset::USDt", decimals: 6, name: "Tether USD", tokenSymbol: "USDT", icon: "/usdt_logo.svg" },
    PYUSD: { type: "0x0::asset::PYUSD", decimals: 6, name: "PayPal USD", tokenSymbol: "PYUSD", icon: "/paypal-usd-pyusd-logo.svg" },
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