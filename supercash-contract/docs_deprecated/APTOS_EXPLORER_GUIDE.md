# Supercash Smart Contract - Aptos Explorer Testing Guide

This guide provides step-by-step instructions for testing all features of the Supercash smart contract using Aptos Explorer. You'll learn how to interact with each function, what parameters are needed, and how to verify the results.

## Prerequisites

1. An Aptos wallet (e.g., Petra, Martian) with test APT
2. Access to Aptos Explorer: https://explorer.aptoslabs.com/
3. Basic understanding of Aptos transactions

## Contract Deployment

The Supercash smart contract is deployed at:
- **Testnet**: `0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0`
- **Mainnet**: (To be determined)

You can view the contract on Aptos Explorer by navigating to the contract address.

## Step 1: Check Supported Tokens

### Function: `get_supported_tokens`

**Description**: Get a list of all supported tokens in the system.

**Steps**:
1. Go to Aptos Explorer: https://explorer.aptoslabs.com/
2. Navigate to the contract address (testnet: `0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0`)
3. Click on the "Modules" tab
4. Select the "payments" module
5. Scroll down to the "View Functions" section
6. Find and click on `get_supported_tokens`
7. Click "Execute"

**Expected Result**: You should see a vector containing `[0]`, which represents the index of AptosCoin (the only token supported by default).

**Verification**: The result should be a vector with one element `0`, indicating that AptosCoin (at index 0) is supported.

---

## Step 2: Get Token Information

### Function: `get_token_info`

**Description**: Get detailed information about a specific token.

**Steps**:
1. In the same "payments" module, find the `get_token_info` function
2. Enter `0` as the `token_index` parameter (for AptosCoin)
3. Click "Execute"

**Expected Result**: You should see a tuple with 5 elements:
- `name`: "Aptos Coin"
- `symbol`: "APT"
- `decimals`: `8`
- `is_coin`: `true`
- `is_active`: `true`

**Verification**: This confirms that AptosCoin is a Coin type token (not FA token) and is active.

---

## Step 3: Add a New FA Token (Admin Only)

### Function: `add_fa_token`

**Description**: Add a new FA token to the supported tokens list (requires admin privileges).

**Note**: This function can only be called by the contract admin. For testing purposes, we'll show the parameters, but you'll need admin access to execute it.

**Parameters**:
- `name`: Token name (e.g., "USD Coin")
- `symbol`: Token symbol (e.g., "USDC")
- `decimals`: Number of decimals (e.g., `6` for USDC)
- `metadata_addr`: Address of the token's metadata object (e.g., `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`)

**Steps**:
1. In the "payments" module, find the `add_fa_token` function
2. Enter the parameters as described above
3. Click "Execute"

**Expected Result**: If successful, a new token will be added to the supported tokens list.

**Verification**: After adding a token, call `get_supported_tokens` again. You should now see `[0, 1]`, indicating two tokens are supported.

---

## Step 4: Direct Transfer

### Function: `direct_transfer`

**Description**: Transfer tokens directly from one account to another.

**Parameters**:
- `recipient`: Address of the recipient (e.g., `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`)
- `token_index`: Index of the token to transfer (e.g., `0` for AptosCoin)
- `amount`: Amount to transfer in the smallest unit (e.g., `100000000` for 1 APT)

**Steps**:
1. Make sure your wallet is connected and has sufficient APT balance
2. In the "payments" module, find the `direct_transfer` function
3. Enter the parameters:
   - `recipient`: Enter a valid Aptos address
   - `token_index`: Enter `0` (for AptosCoin)
   - `amount`: Enter `100000000` (1 APT)
4. Click "Execute"
5. Confirm the transaction in your wallet

**Expected Result**: The transaction should succeed, and the recipient should receive 1 APT.

**Verification**:
1. Check the transaction details on Aptos Explorer
2. Look for the `DirectTransferEvent` in the events tab
3. Verify that the sender, recipient, token_id, and amount match your inputs
4. Check the recipient's balance to confirm it increased by 1 APT

---

## Step 5: Batch Direct Transfer

### Function: `batch_direct_transfer`

**Description**: Transfer tokens to multiple recipients in a single transaction.

**Parameters**:
- `recipients`: Vector of recipient addresses (e.g., `[0x123..., 0x456...]`)
- `amounts`: Vector of amounts corresponding to each recipient (e.g., `[100000000, 200000000]`)
- `token_index`: Index of the token to transfer (e.g., `0` for AptosCoin)

**Steps**:
1. Make sure your wallet is connected and has sufficient APT balance
2. In the "payments" module, find the `batch_direct_transfer` function
3. Enter the parameters:
   - `recipients`: Enter a vector of valid Aptos addresses (e.g., `["0x123...", "0x456..."]`)
   - `amounts`: Enter a vector of amounts (e.g., `[100000000, 200000000]`)
   - `token_index`: Enter `0` (for AptosCoin)
4. Click "Execute"
5. Confirm the transaction in your wallet

**Expected Result**: The transaction should succeed, and each recipient should receive their respective amount.

**Verification**:
1. Check the transaction details on Aptos Explorer
2. Look for the `BatchTransferEvent` in the events tab
3. Verify that the sender, token_id, recipients, amounts, and total_amount match your inputs
4. Check each recipient's balance to confirm it increased by the respective amount

---

## Step 6: Create a Link Transfer

### Function: `transfer_with_link`

**Description**: Create a link-based transfer that can be claimed by anyone with the secret.

**Parameters**:
- `token_index`: Index of the token to transfer (e.g., `0` for AptosCoin)
- `commitment`: 32-byte commitment hash (see below for how to generate)
- `amount`: Amount to transfer in the smallest unit (e.g., `100000000` for 1 APT)
- `expiry`: Unix timestamp when the link expires (e.g., current timestamp + 3600 for 1 hour)

**Generating a Commitment**:
To create a commitment, you need to:
1. Generate a random 32-byte secret (e.g., `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`)
2. Generate a nonce (can be any number, e.g., `12345`)
3. Calculate the expiry timestamp (e.g., `1710000000`)
4. Create a commitment using the formula: `SHA3(secret + amount + nonce + expiry + sender_address)`

For testing purposes, you can use this pre-calculated commitment:
- `commitment`: `0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890`

**Steps**:
1. Make sure your wallet is connected and has sufficient APT balance
2. In the "payments" module, find the `transfer_with_link` function
3. Enter the parameters:
   - `token_index`: Enter `0` (for AptosCoin)
   - `commitment`: Enter the pre-calculated commitment or your own
   - `amount`: Enter `100000000` (1 APT)
   - `expiry`: Enter a future timestamp (e.g., `1710000000`)
4. Click "Execute"
5. Confirm the transaction in your wallet

**Expected Result**: The transaction should succeed, and a link transfer object should be created.

**Verification**:
1. Check the transaction details on Aptos Explorer
2. Look for the `LinkCreatedEvent` in the events tab
3. Note the `object_address` from the event - you'll need this to claim the transfer
4. Verify that the sender, token_id, commitment, amount, and expiry match your inputs

---

## Step 7: Claim a Link Transfer

### Function: `claim_transfer_link`

**Description**: Claim tokens from a link-based transfer.

**Parameters**:
- `secret`: 32-byte secret used to create the commitment (e.g., `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`)
- `amount`: Amount to claim (must match the original amount)
- `nonce`: Nonce used in the commitment (must match the original nonce)
- `expiry`: Expiration timestamp (must match the original expiry)
- `sender_addr`: Address of the link creator (must match the original sender)
- `object_address`: Address of the link transfer object (from the LinkCreatedEvent)

**Steps**:
1. Make sure your wallet is connected
2. In the "payments" module, find the `claim_transfer_link` function
3. Enter the parameters:
   - `secret`: Enter the secret used to create the commitment
   - `amount`: Enter the same amount used to create the link (e.g., `100000000`)
   - `nonce`: Enter the same nonce used to create the commitment (e.g., `12345`)
   - `expiry`: Enter the same expiry used to create the commitment (e.g., `1710000000`)
   - `sender_addr`: Enter the address of the original sender
   - `object_address`: Enter the object address from the LinkCreatedEvent
4. Click "Execute"
5. Confirm the transaction in your wallet

**Expected Result**: The transaction should succeed, and you should receive the tokens.

**Verification**:
1. Check the transaction details on Aptos Explorer
2. Look for the `LinkClaimedEvent` in the events tab
3. Verify that the claimer, sender, token_id, amount, and commitment match your inputs
4. Check your balance to confirm it increased by the claimed amount

---

## Step 8: Get Link Transfer Information

### Function: `get_link_transfer_info`

**Description**: Get information about a link transfer.

**Parameters**:
- `object_address`: Address of the link transfer object

**Steps**:
1. In the "payments" module, find the `get_link_transfer_info` function
2. Enter the `object_address` parameter (from the LinkCreatedEvent)
3. Click "Execute"

**Expected Result**: You should see a tuple with 5 elements:
- `sender`: Address of the link creator
- `token_id`: ID of the token
- `amount`: Amount locked in the transfer
- `expiry`: Expiration timestamp
- `claimed`: Boolean indicating if the transfer has been claimed

**Verification**: Verify that the information matches what you used to create the link transfer.

---

## Step 9: Check if a Link is Expired

### Function: `is_link_expired`

**Description**: Check if a link transfer has expired.

**Parameters**:
- `object_address`: Address of the link transfer object

**Steps**:
1. In the "payments" module, find the `is_link_expired` function
2. Enter the `object_address` parameter (from the LinkCreatedEvent)
3. Click "Execute"

**Expected Result**: You should see a boolean value:
- `true` if the link has expired or doesn't exist
- `false` if the link is still valid

**Verification**: Compare the result with the current timestamp and the expiry timestamp from the link transfer info.

---

## Step 10: Refund an Expired Link

### Function: `refund_expired_link`

**Description**: Refund tokens from an expired link transfer (only the original sender can do this).

**Parameters**:
- `object_address`: Address of the link transfer object

**Steps**:
1. Make sure your wallet is connected and is the original sender of the link
2. Wait for the link to expire (or set a short expiry time when creating the link)
3. In the "payments" module, find the `refund_expired_link` function
4. Enter the `object_address` parameter (from the LinkCreatedEvent)
5. Click "Execute"
6. Confirm the transaction in your wallet

**Expected Result**: The transaction should succeed, and the tokens should be refunded to the original sender.

**Verification**:
1. Check the transaction details on Aptos Explorer
2. Check your balance to confirm it increased by the refunded amount

---

## Step 11: Get System Statistics

### Function: `get_system_stats`

**Description**: Get overall system statistics.

**Steps**:
1. In the "payments" module, find the `get_system_stats` function
2. Click "Execute"

**Expected Result**: You should see a tuple with 4 elements:
- `total_direct_transfers`: Number of direct transfers processed
- `total_link_transfers`: Number of link transfers created
- `total_claims`: Number of link transfers claimed
- `token_volumes`: Vector of total volume processed per token

**Verification**: Verify that the statistics match your activity. For example, if you've performed one direct transfer, the `total_direct_transfers` should be `1`.

---

## Step 12: Pause/Unpause the Contract (Admin Only)

### Function: `set_paused`

**Description**: Pause or unpause the contract (admin only).

**Parameters**:
- `paused`: Boolean indicating whether to pause (`true`) or unpause (`false`) the contract

**Steps**:
1. Make sure your wallet is connected and is the contract admin
2. In the "payments" module, find the `set_paused` function
3. Enter `true` as the `paused` parameter to pause the contract
4. Click "Execute"
5. Confirm the transaction in your wallet

**Expected Result**: The contract should be paused, and all functions should return an error when called.

**Verification**:
1. Try to call any function (e.g., `get_supported_tokens`)
2. You should receive an error with code `3001` (E_CONTRACT_PAUSED)
3. Repeat the steps with `paused` set to `false` to unpause the contract
4. Verify that functions work again after unpausing

---

## Tips for Testing

1. **Use Small Amounts**: When testing transfers, use small amounts (e.g., 0.1 APT) to minimize costs.

2. **Keep Track of Parameters**: When creating link transfers, keep track of all parameters (secret, amount, nonce, expiry, sender address, object address) as you'll need them to claim the transfer.

3. **Check Events**: Always check the events tab in transaction details to verify that the expected events were emitted with the correct parameters.

4. **Test Error Cases**: Try to call functions with invalid parameters to see the error messages. For example:
   - Try to transfer zero amount
   - Try to transfer to yourself
   - Try to claim a link with an incorrect secret
   - Try to claim an already claimed link

5. **Use Testnet**: Always use the testnet for testing to avoid losing real funds.

6. **Check Balances**: Before and after transfers, check account balances to verify the transfers worked correctly.

## Common Issues and Solutions

1. **"Contract is paused" error**: The contract may be paused by the admin. Wait for it to be unpaused or contact the admin.

2. **"Insufficient balance" error**: Make sure your account has enough tokens for the transfer.

3. **"Invalid commitment" error**: Ensure the commitment is a valid 32-byte hash and matches the parameters used to create it.

4. **"Link expired" error**: Make sure the current timestamp is before the expiry timestamp.

5. **"Already claimed" error**: Each link can only be claimed once. Check if the link has already been claimed.

6. **"Invalid secret" error**: Ensure the secret matches the one used to create the commitment.

## Conclusion

This guide has walked you through all the features of the Supercash smart contract. By following these steps, you should now have a good understanding of how the contract works and how to interact with it using Aptos Explorer.

For more advanced usage, consider integrating the contract into a frontend application using the Frontend Developer Guide.