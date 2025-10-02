import { CONTRACT_ADDRESS, TOKENS } from "@/config/constants";

export const getInstantTransferCoinPayload = (recipient: string, amount: number) => ({
    function: "0x1::coin::transfer",
    typeArguments: [TOKENS.APT.type],
    functionArguments: [recipient, amount],
});

export const getInstantTransferFungibleAssetPayload = (tokenSymbol: string, metadataAddress: string, recipient: string, amount: number) => ({
    function: "0x1::fungible_asset::transfer",
    typeArguments: [TOKENS[tokenSymbol].type],
    // Correct arguments are: [metadata_address, recipient_address, amount]
    functionArguments: [metadataAddress, recipient, amount],
});

export const getCreateLinkCoinPayload = (amount: number, hash: Uint8Array, expiry: number = 86400) => ({
  function: `${CONTRACT_ADDRESS}::payments::create_link_coin`,
  typeArguments: [TOKENS.APT.type],
  functionArguments: [amount, Array.from(hash), expiry],
});

export const getCreateLinkFungibleAssetPayload = (tokenSymbol: string, metadataAddress: string, amount: number, hash: Uint8Array, expiry: number = 86400) => ({
  function: `${CONTRACT_ADDRESS}::payments::create_link_fa`,
  typeArguments: [TOKENS[tokenSymbol].type],
  functionArguments: [metadataAddress, amount, Array.from(hash), expiry],
});
