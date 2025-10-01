# SuperCash Contract   Function Quick Reference
 
 This is a handy reference for testing SuperCash contract functions in Aptos Explorer.
 
 ## 🔗 Contract Address Format
 ```
 0xYOUR_DEPLOYED_ADDRESS::payments::FUNCTION_NAME
 ```
 
 ## 💰 Direct Transfer Functions
 
 ### `direct_transfer_apt`
 **Purpose**: Send APT directly to another address
 
 **Parameters**:
   `recipient`: `address`   Destination address
   `amount`: `u64`   Amount in octas (1 APT = 100,000,000 octas)
 
 **Example**:
 ```
 recipient: 0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
 amount: 1000000
 ```
 
 ### `direct_transfer_fa`
 **Purpose**: Send fungible asset tokens (USDC/PYUSD/USDT)
 
 **Parameters**:
   `recipient`: `address`   Destination address
   `token_id`: `u8`   Token identifier (2=USDC, 3=PYUSD, 4=USDT)
   `amount`: `u64`   Amount in token's native decimals
 
 **Example**:
 ```
 recipient: 0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
 token_id: 2
 amount: 1000000
 ```
 
 ### `batch_direct_transfer_apt`
 **Purpose**: Send APT to multiple recipients in one transaction
 
 **Parameters**:
   `recipients`: `vector<address>`   Array of destination addresses
   `amounts`: `vector<u64>`   Array of amounts (same order as recipients)
 
 **Example**:
 ```
 recipients: ["0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8","0x123d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8"]
 amounts: [1000000, 2000000]
 ```
 
 ## 🔗 Link Transfer Functions
 
 ### `transfer_with_link_apt`
 **Purpose**: Create a payment link for APT
 
 **Parameters**:
   `commitment`: `vector<u8>`   32 byte cryptographic commitment
   `amount`: `u64`   Amount in octas
   `expiry`: `u64`   Unix timestamp when link expires
 
 **Example**:
 ```
 commitment: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
 amount: 5000000
 expiry: 1735689600
 ```
 
 ### `transfer_with_link_fa`
 **Purpose**: Create a payment link for FA tokens
 
 **Parameters**:
   `token_id`: `u8`   Token identifier (2=USDC, 3=PYUSD, 4=USDT)
   `commitment`: `vector<u8>`   32 byte cryptographic commitment
   `amount`: `u64`   Amount in token's native decimals
   `expiry`: `u64`   Unix timestamp when link expires
 
 **Example**:
 ```
 token_id: 2
 commitment: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
 amount: 1000000
 expiry: 1735689600
 ```
 
 ### `claim_transfer_link`
 **Purpose**: Claim a payment link
 
 **Parameters**:
   `secret`: `vector<u8>`   32 byte secret from the link
   `amount`: `u64`   Amount being claimed
   `nonce`: `u64`   Nonce from link creation
   `expiry`: `u64`   Expiry timestamp from link
   `sender_addr`: `address`   Original sender's address
   `object_address`: `address`   Link transfer object address
 
 **Example**:
 ```
 secret: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
 amount: 5000000
 nonce: 123456789
 expiry: 1735689600
 sender_addr: 0xSENDER_ADDRESS
 object_address: 0xOBJECT_ADDRESS_FROM_LINK_CREATION
 ```
 
 ## 👁️ View Functions (Read Only)
 
 ### `get_system_stats`
 **Purpose**: Get overall contract statistics
 
 **Parameters**: None
 
 **Returns**: `(u64, u64, u64, vector<u64>)`
   Total direct transfers
   Total link transfers
   Total claims
   Token volumes [APT, USDC, PYUSD, USDT]
 
 ### `get_supported_tokens`
 **Purpose**: Get list of active token IDs
 
 **Parameters**: None
 
 **Returns**: `vector<u8>`   Array of active token IDs
 
 ### `get_token_info`
 **Purpose**: Get information about a specific token
 
 **Parameters**:
   `token_id`: `u8`   Token identifier
 
 **Returns**: `(String, String, u8, bool, bool)`
   Token name
   Token symbol
   Decimals
   Is coin type (true) or FA (false)
   Is active
 
 **Example**:
 ```
 token_id: 1
 ```
 
 ### `get_link_transfer_info`
 **Purpose**: Get details about a link transfer
 
 **Parameters**:
   `object_address`: `address`   Link transfer object address
 
 **Returns**: `(address, u8, u64, u64, bool)`
   Sender address
   Token ID
   Amount
   Expiry timestamp
   Is claimed
 
 **Example**:
 ```
 object_address: 0xOBJECT_ADDRESS_FROM_CREATION
 ```
 
 ### `is_link_expired`
 **Purpose**: Check if a link has expired
 
 **Parameters**:
   `object_address`: `address`   Link transfer object address
 
 **Returns**: `bool`   True if expired
 
 **Example**:
 ```
 object_address: 0xOBJECT_ADDRESS_FROM_CREATION
 ```
 
 ## 🔧 Admin Functions
 
 ### `set_fa_token_metadata`
 **Purpose**: Configure FA token metadata (admin only)
 
 **Parameters**:
   `token_id`: `u8`   Token identifier (2=USDC, 3=PYUSD, 4=USDT)
   `metadata_addr`: `address`   Token metadata contract address
 
 **Example**:
 ```
 token_id: 2
 metadata_addr: 0xUSDC_METADATA_CONTRACT_ADDRESS
 ```
 
 ### `set_paused`
 **Purpose**: Pause/unpause the contract (admin only)
 
 **Parameters**:
   `paused`: `bool`   True to pause, false to unpause
 
 **Example**:
 ```
 paused: true
 ```
 
 ### `refund_expired_link`
 **Purpose**: Refund an expired link (sender only)
 
 **Parameters**:
   `object_address`: `address`   Link transfer object address
 
 **Example**:
 ```
 object_address: 0xEXPIRED_LINK_OBJECT_ADDRESS
 ```
 
 ## 🔢 Token IDs Reference
 
 | Token | ID | Type | Status |
 |       |    |      |        |
 | APT   | 1  | Coin | Active |
 | USDC  | 2  | FA   | Needs admin setup |
 | PYUSD | 3  | FA   | Needs admin setup |
 | USDT  | 4  | FA   | Needs admin setup |
 
 ## 💡 Common Values for Testing
 
 ### APT Amounts (in octas)
   `1000000` = 0.01 APT
   `10000000` = 0.1 APT  
   `100000000` = 1 APT
   `1000000000` = 10 APT
 
 ### Sample Timestamps
   `1704067200` = Jan 1, 2024
   `1735689600` = Jan 1, 2025
   `1767225600` = Jan 1, 2026
 
 ### Sample Addresses
 ```
 0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
 0x123d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
 0xabcd35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
 ```
 
 ### Sample 32 byte Commitment
 ```
 [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
 ```
 
 ## 🧪 Testing Scenarios
 
 ### Scenario 1: Basic Transfer
 1. Call `direct_transfer_apt` with small amount
 2. Check `get_system_stats` to verify counter increased
 3. Verify recipient received funds
 
 ### Scenario 2: Link Creation & Claim
 1. Call `transfer_with_link_apt` with test commitment
 2. Note `object_address` from events
 3. Call `get_link_transfer_info` to verify link details
 4. Call `claim_transfer_link` with matching secret
 5. Verify funds transferred to claimer
 
 ### Scenario 3: Batch Operations
 1. Call `batch_direct_transfer_apt` with multiple recipients
 2. Check all recipients received correct amounts
 3. Verify stats show multiple transfers
 
 ### Scenario 4: Error Testing
 1. Try `direct_transfer_apt` with amount = 0 (should fail)
 2. Try `claim_transfer_link` with wrong secret (should fail)
 3. Try expired link operations (should fail)
 
 ## 📋 Event Types to Watch
 
   `DirectTransferEvent`   Direct transfer completed
   `LinkCreatedEvent`   Link transfer created  
   `LinkClaimedEvent`   Link transfer claimed
   `BatchTransferEvent`   Batch transfer completed
   `TokenAddedEvent`   FA token configured
 
 ## 🚨 Error Codes
 
 | Code | Meaning |
 |      |         |
 | 1001 | Insufficient balance |
 | 1002 | Invalid amount |
 | 1003 | Self transfer not allowed |
 | 2001 | Invalid commitment |
 | 2002 | Link expired |
 | 2003 | Already claimed |
 | 2004 | Invalid secret |
 | 3001 | Contract paused |
 | 3002 | Unauthorized |
 
    
 
 **Quick Tip**: Copy paste these examples directly into Aptos Explorer for instant testing! 🚀