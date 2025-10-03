import { CONTRACT_ADDRESS } from "@/config/constants";

export const getInstantTransferCoinPayload = (recipient: string, amount: number, aptTokenType: string) => ({
    function: "0x1::coin::transfer",
    typeArguments: [aptTokenType],
    functionArguments: [recipient, amount],
});

export const getInstantTransferFungibleAssetPayload = (tokenSymbol: string, metadataAddress: string, recipient: string, amount: number) => ({
    function: "0x1::fungible_asset::transfer",
    // Correct arguments are: [metadata_address, recipient_address, amount]
    functionArguments: [metadataAddress, recipient, amount],
});

export const getCreateLinkCoinPayload = (amount: number, hash: Uint8Array, expiry: number = 86400, aptTokenType: string) => ({
  function: `${CONTRACT_ADDRESS}::payments::create_link_coin`,
  typeArguments: [aptTokenType],
  functionArguments: [amount, Array.from(hash), expiry],
});

export const getCreateLinkFungibleAssetPayload = (tokenSymbol: string, metadataAddress: string, amount: number, hash: Uint8Array, expiry: number = 86400) => ({
  function: `${CONTRACT_ADDRESS}::payments::create_link_fa`,
  functionArguments: [metadataAddress, amount, Array.from(hash), expiry],
});

export const getClaimLinkCoinPayload = (senderAddress: string, hash: Uint8Array, aptTokenType: string) => ({
  function: `${CONTRACT_ADDRESS}::payments::claim_link_coin`,
  typeArguments: [aptTokenType],
  functionArguments: [senderAddress, Array.from(hash)],
});

export const getClaimLinkFungibleAssetPayload = (senderAddress: string, hash: Uint8Array) => ({
  function: `${CONTRACT_ADDRESS}::payments::claim_link_fa`,
  functionArguments: [senderAddress, Array.from(hash)],
});

export const getCancelLinkCoinPayload = (hash: Uint8Array, aptTokenType: string) => ({
  function: `${CONTRACT_ADDRESS}::payments::cancel_link_coin`,
  typeArguments: [aptTokenType],
  functionArguments: [Array.from(hash)],
});

export const getCancelLinkFungibleAssetPayload = (hash: Uint8Array) => ({
  function: `${CONTRACT_ADDRESS}::payments::cancel_link_fa`,
  functionArguments: [Array.from(hash)],
});