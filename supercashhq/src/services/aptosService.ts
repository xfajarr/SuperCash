import { CONTRACT_ADDRESS, MONEY_STREAM_CONTRACT_ADDRESS } from "@/config/constants";

export const getInstantTransferCoinPayload = (recipient: string, amount: number, aptTokenType: string) => ({
    function: "0x1::coin::transfer",
    typeArguments: [aptTokenType],
    functionArguments: [recipient, amount],
});

export const getInstantTransferFungibleAssetPayload = (tokenType: string, recipient: string, metadataAddress: string, amount: number) => ({
    function: "0x1::primary_fungible_store::transfer",
    typeArguments: [tokenType],
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

// Money Streaming Payload Functions
export const getInitializeHubCoinPayload = (coinType: string) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::initialize_hub_coin`,
  typeArguments: [coinType],
  functionArguments: [],
});

export const getCreateStreamCoinPayload = (
  recipient: string,
  totalAmount: number,
  startTime: number,
  endTime: number,
  cliffDurationSeconds: number,
  coinType: string
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_coin`,
  typeArguments: [coinType],
  functionArguments: [recipient, totalAmount, startTime, endTime, cliffDurationSeconds],
});

export const getCreateStreamByRateCoinPayload = (
  recipient: string,
  amountPerInterval: number,
  intervalUnit: number,
  durationSeconds: number,
  cliffDurationSeconds: number,
  coinType: string
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_by_rate_coin`,
  typeArguments: [coinType],
  functionArguments: [recipient, amountPerInterval, intervalUnit, durationSeconds, cliffDurationSeconds],
});

export const getWithdrawFromStreamCoinPayload = (
  senderAddress: string,
  streamId: number,
  coinType: string
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::withdraw_from_stream_coin`,
  typeArguments: [coinType],
  functionArguments: [senderAddress, streamId],
});

export const getPauseStreamCoinPayload = (streamId: number, coinType: string) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::pause_stream_coin`,
  typeArguments: [coinType],
  functionArguments: [streamId],
});

export const getResumeStreamCoinPayload = (streamId: number, coinType: string) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::resume_stream_coin`,
  typeArguments: [coinType],
  functionArguments: [streamId],
});

export const getCancelStreamCoinPayload = (senderAddress: string, streamId: number, coinType: string) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::cancel_stream_coin`,
  typeArguments: [coinType],
  functionArguments: [senderAddress, streamId],
});

// Fungible Asset Money Streaming Payload Functions
export const getInitializeHubFaPayload = () => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::initialize_hub_fa`,
  functionArguments: [],
});

export const getCreateStreamFaPayload = (
  recipient: string,
  metadataAddress: string,
  totalAmount: number,
  startTime: number,
  endTime: number,
  cliffDurationSeconds: number
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_fa`,
  functionArguments: [recipient, metadataAddress, totalAmount, startTime, endTime, cliffDurationSeconds],
});

export const getCreateStreamByRateFaPayload = (
  recipient: string,
  metadataAddress: string,
  amountPerInterval: number,
  intervalUnit: number,
  durationSeconds: number,
  cliffDurationSeconds: number
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_by_rate_fa`,
  functionArguments: [recipient, metadataAddress, amountPerInterval, intervalUnit, durationSeconds, cliffDurationSeconds],
});

export const getWithdrawFromStreamFaPayload = (
  senderAddress: string,
  streamId: number
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::withdraw_from_stream_fa`,
  functionArguments: [senderAddress, streamId],
});

export const getPauseStreamFaPayload = (streamId: number) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::pause_stream_fa`,
  functionArguments: [streamId],
});

export const getResumeStreamFaPayload = (streamId: number) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::resume_stream_fa`,
  functionArguments: [streamId],
});

export const getCancelStreamFaPayload = (senderAddress: string, streamId: number) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::cancel_stream_fa`,
  functionArguments: [senderAddress, streamId],
});

// View Functions
export const getViewClaimableAmountCoinPayload = (
  senderAddress: string,
  streamId: number,
  coinType: string
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::view_claimable_amount_coin`,
  typeArguments: [coinType],
  functionArguments: [senderAddress, streamId],
});

export const getViewClaimableAmountFaPayload = (
  senderAddress: string,
  streamId: number
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::view_claimable_amount_fa`,
  functionArguments: [senderAddress, streamId],
});

export const getFlowRateCoinPayload = (
  senderAddress: string,
  streamId: number,
  coinType: string
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_flow_rate_coin`,
  typeArguments: [coinType],
  functionArguments: [senderAddress, streamId],
});

export const getFlowRateFaPayload = (
  senderAddress: string,
  streamId: number
) => ({
  function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_flow_rate_fa`,
  functionArguments: [senderAddress, streamId],
});