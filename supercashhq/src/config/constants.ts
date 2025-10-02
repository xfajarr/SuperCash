export const CONTRACT_ADDRESS = "0xe012406f23b3c3101a8c3d506e8b6df0e6d69598a526e78827be2d42e5d10dc9";

export const TOKENS: { [key: string]: { type: string; decimals: number; name: string } } = {
  APT: { type: "0x1::aptos_coin::AptosCoin", decimals: 8, name: "Aptos" },
  USDC: { type: "0xe012406f23b3c3101a8c3d506e8b6df0e6d69598a526e78827be2d42e5d10dc9::riverfi::mock_usdc", decimals: 6, name: "USD Coin" },
  USDT: { type: "0xd5d0d561493ea2b9410f67da804653ae44e793c2423707d4f11edb2e38192050::usdt::usdt", decimals: 6, name: "Tether USD" },
  PYUSD: { type: "0x0::asset::PYUSD", decimals: 6, name: "PayPal USD" },
};