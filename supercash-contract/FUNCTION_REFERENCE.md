# Supercash Function Reference

This document provides a quick reference for all functions in the Supercash smart contract system.

## Module: supercash::payments

### Core Payment Functions

#### direct_transfer
```move
public entry fun direct_transfer(
    sender: &signer,
    recipient: address,
    token_index: u64,
    amount: u64
) acquires SystemState
```

**Description**: High-performance direct transfer for all token types.

**Parameters**:
- `sender: &signer` - The account sending the tokens
- `recipient: address` - The account receiving the tokens
- `token_index: u64` - Index of the token in the supported tokens list
- `amount: u64` - Amount to transfer

**Access**: Public entry function

**Acquires**: SystemState

**Emits**: DirectTransferEvent

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_INVALID_AMOUNT` (1002): Amount is zero or negative
- `E_SELF_TRANSFER` (1003): Sender and recipient are the same

---

#### batch_direct_transfer
```move
public entry fun batch_direct_transfer(
    sender: &signer,
    recipients: vector<address>,
    amounts: vector<u64>,
    token_index: u64
) acquires SystemState
```

**Description**: Batch transfers for improved throughput.

**Parameters**:
- `sender: &signer` - The account sending the tokens
- `recipients: vector<address>` - List of recipient addresses
- `amounts: vector<u64>` - Corresponding amounts for each recipient
- `token_index: u64` - Index of the token in the supported tokens list

**Access**: Public entry function

**Acquires**: SystemState

**Emits**: BatchTransferEvent

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_INVALID_AMOUNT` (1002): Invalid amount or mismatched vectors
- `E_SELF_TRANSFER` (1003): Self-transfer attempt in batch

---

#### transfer_with_link
```move
public entry fun transfer_with_link(
    sender: &signer,
    token_index: u64,
    commitment: vector<u8>,
    amount: u64,
    expiry: u64
) acquires SystemState
```

**Description**: Creates a link-based transfer for claiming without a recipient address.

**Parameters**:
- `sender: &signer` - The account creating the link
- `token_index: u64` - Index of the token in the supported tokens list
- `commitment: vector<u8>` - 32-byte commitment hash
- `amount: u64` - Amount to transfer
- `expiry: u64` - Unix timestamp when the link expires

**Access**: Public entry function

**Acquires**: SystemState

**Emits**: LinkCreatedEvent

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_INVALID_COMMITMENT` (2001): Invalid commitment hash format
- `E_LINK_EXPIRED` (2002): Link expiry time is invalid
- `E_INVALID_AMOUNT` (1002): Amount is zero or negative

---

#### claim_transfer_link
```move
public entry fun claim_transfer_link(
    claimer: &signer,
    secret: vector<u8>,
    amount: u64,
    nonce: u64,
    expiry: u64,
    sender_addr: address,
    object_address: address
) acquires LinkTransfer, SystemState
```

**Description**: Claims tokens from a link-based transfer.

**Parameters**:
- `claimer: &signer` - The account claiming the tokens
- `secret: vector<u8>` - 32-byte secret used to create the commitment
- `amount: u64` - Amount to claim
- `nonce: u64` - Nonce used in the commitment
- `expiry: u64` - Expiration timestamp
- `sender_addr: address` - Address of the link creator
- `object_address: address` - Address of the link transfer object

**Access**: Public entry function

**Acquires**: LinkTransfer, SystemState

**Emits**: LinkClaimedEvent, ClaimFAEvent (for FA tokens)

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_INVALID_SECRET` (2004): Invalid secret format
- `E_LINK_NOT_FOUND` (2005): Link transfer object not found
- `E_ALREADY_CLAIMED` (2003): Link has already been claimed
- `E_LINK_EXPIRED` (2002): Link has expired
- `E_INVALID_SECRET` (2004): Secret doesn't match commitment
- `E_INVALID_AMOUNT` (1002): Amount doesn't match
- `E_INVALID_NONCE` (3003): Nonce doesn't match
- `E_NOT_SENDER` (2006): Sender address doesn't match

### Token Management Functions

#### add_fa_token
```move
public entry fun add_fa_token(
    admin: &signer,
    name: String,
    symbol: String,
    decimals: u8,
    metadata_addr: address
) acquires SystemState
```

**Description**: Adds a new FA token to the supported tokens list (Admin only).

**Parameters**:
- `admin: &signer` - Admin account
- `name: String` - Name of the token
- `symbol: String` - Symbol of the token
- `decimals: u8` - Number of decimal places
- `metadata_addr: address` - Address of the token's metadata object

**Access**: Public entry function (Admin only)

**Acquires**: SystemState

**Emits**: TokenAddedEvent

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_UNAUTHORIZED` (3002): Caller is not the admin

---

### View Functions

#### get_token_info
```move
#[view]
public fun get_token_info(token_index: u64): (String, String, u8, bool, bool) acquires SystemState
```

**Description**: Get token configuration by index.

**Parameters**:
- `token_index: u64` - Index of the token in the supported tokens list

**Returns**: `(String, String, u8, bool, bool)` - Token name, symbol, decimals, is_coin, is_active

**Access**: Public view function

**Acquires**: SystemState

---

#### get_link_transfer_info
```move
#[view]
public fun get_link_transfer_info(object_address: address): (address, u8, u64, u64, bool) acquires LinkTransfer
```

**Description**: Get link transfer information.

**Parameters**:
- `object_address: address` - Address of the link transfer object

**Returns**: `(address, u8, u64, u64, bool)` - Sender address, token ID, amount, expiry, claimed status

**Access**: Public view function

**Acquires**: LinkTransfer

---

#### is_link_expired
```move
#[view]
public fun is_link_expired(object_address: address): bool acquires LinkTransfer
```

**Description**: Check if a link is expired.

**Parameters**:
- `object_address: address` - Address of the link transfer object

**Returns**: `bool` - True if link is expired or doesn't exist

**Access**: Public view function

**Acquires**: LinkTransfer

---

#### get_system_stats
```move
#[view]
public fun get_system_stats(): (u64, u64, u64, vector<u64>) acquires SystemState
```

**Description**: Get system statistics.

**Returns**: `(u64, u64, u64, vector<u64>)` - Direct transfers count, link transfers count, claims count, token volumes

**Access**: Public view function

**Acquires**: SystemState

---

#### get_supported_tokens
```move
#[view]
public fun get_supported_tokens(): vector<u64> acquires SystemState
```

**Description**: Get all supported tokens.

**Returns**: `vector<u64>` - Vector of token indices

**Access**: Public view function

**Acquires**: SystemState

---

### Admin Functions

#### set_paused
```move
public entry fun set_paused(admin: &signer, paused: bool) acquires SystemState
```

**Description**: Pause/unpause the contract (Admin only).

**Parameters**:
- `admin: &signer` - Admin account
- `paused: bool` - Pause state to set

**Access**: Public entry function (Admin only)

**Acquires**: SystemState

**Errors**:
- `E_UNAUTHORIZED` (3002): Caller is not the admin

---

#### refund_expired_link
```move
public entry fun refund_expired_link(
    sender: &signer,
    object_address: address
) acquires LinkTransfer, SystemState
```

**Description**: Refund an expired link transfer (Sender only).

**Parameters**:
- `sender: &signer` - Original sender of the link
- `object_address: address` - Address of the link transfer object

**Access**: Public entry function (Sender only)

**Acquires**: LinkTransfer, SystemState

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_LINK_NOT_FOUND` (2005): Link transfer object not found
- `E_NOT_SENDER` (2006): Caller is not the original sender
- `E_NOT_EXPIRED` (2007): Link has not expired yet
- `E_ALREADY_CLAIMED` (2003): Link has already been claimed

---

### Internal Functions

#### assert_token_supported
```move
fun assert_token_supported(token_index: u64) acquires SystemState
```

**Description**: Check if token is supported and active.

**Parameters**:
- `token_index: u64` - Index of the token to check

**Access**: Internal function

**Acquires**: SystemState

**Errors**:
- `E_INVALID_AMOUNT` (1002): Token index is invalid or token is inactive

---

#### get_token_metadata
```move
fun get_token_metadata(token_index: u64): address acquires SystemState
```

**Description**: Get token metadata address for FA tokens.

**Parameters**:
- `token_index: u64` - Index of the token

**Returns**: `address` - Metadata address

**Access**: Internal function

**Acquires**: SystemState

**Errors**:
- `E_INVALID_AMOUNT` (1002): Token metadata not available

---

#### assert_not_paused
```move
fun assert_not_paused() acquires SystemState
```

**Description**: Check if the contract is not paused.

**Access**: Internal function

**Acquires**: SystemState

**Errors**:
- `E_CONTRACT_PAUSED` (3001): Contract is paused

---

### Initialization Functions

#### init_module
```move
fun init_module(deployer: &signer)
```

**Description**: Initialize the module with default tokens and system state.

**Parameters**:
- `deployer: &signer` - Deployer account

**Access**: Module initialization function

---

#### init_module_for_test
```move
#[test_only]
public fun init_module_for_test(deployer: &signer)
```

**Description**: Initialize the module for testing.

**Parameters**:
- `deployer: &signer` - Deployer account

**Access**: Public test function

---

## Module: supercash::utils

### Cryptographic Functions

#### create_commitment
```move
public fun create_commitment(
    secret: vector<u8>,
    amount: u64,
    nonce: u64,
    expiry: u64,
    sender_addr: address
): vector<u8>
```

**Description**: Create a cryptographic commitment for link-based transfers.

**Parameters**:
- `secret: vector<u8>` - 32-byte secret
- `amount: u64` - Transfer amount
- `nonce: u64` - Unique nonce
- `expiry: u64` - Expiration timestamp
- `sender_addr: address` - Sender's address

**Returns**: `vector<u8>` - 32-byte SHA3-256 hash

---

#### verify_commitment
```move
public fun verify_commitment(
    commitment: vector<u8>,
    secret: vector<u8>,
    amount: u64,
    nonce: u64,
    expiry: u64,
    sender_addr: address
): bool
```

**Description**: Verify a commitment against provided parameters.

**Parameters**: Same as `create_commitment`

**Returns**: `bool` - True if commitment is valid

---

#### generate_nonce
```move
public fun generate_nonce(sender: address, extra_entropy: vector<u8>): u64
```

**Description**: Generate a secure nonce using block information and entropy.

**Parameters**:
- `sender: address` - Sender's address
- `extra_entropy: vector<u8>` - Additional entropy

**Returns**: `u64` - Generated nonce

---

### Utility Functions

#### u64_to_bytes
```move
public fun u64_to_bytes(value: u64): vector<u8>
```

**Description**: Convert u64 to little-endian byte array.

**Parameters**:
- `value: u64` - Value to convert

**Returns**: `vector<u8>` - Byte array representation

---

#### address_to_bytes
```move
public fun address_to_bytes(addr: address): vector<u8>
```

**Description**: Convert address to byte array.

**Parameters**:
- `addr: address` - Address to convert

**Returns**: `vector<u8>` - Byte array representation

---

#### is_expired
```move
public fun is_expired(expiry: u64): bool
```

**Description**: Check if a timestamp is expired.

**Parameters**:
- `expiry: u64` - Expiration timestamp

**Returns**: `bool` - True if expired

---

#### batch_hash
```move
public fun batch_hash(items: vector<vector<u8>>): vector<vector<u8>>
```

**Description**: Batch multiple hash operations.

**Parameters**:
- `items: vector<vector<u8>>` - Vector of items to hash

**Returns**: `vector<vector<u8>>` - Vector of hash results

---

## Module: supercash::errors

### Error Code Constants

#### Direct Transfer Errors
- `E_INSUFFICIENT_BALANCE` (1001): Insufficient balance for the transfer
- `E_INVALID_AMOUNT` (1002): Invalid transfer amount (zero or negative)
- `E_SELF_TRANSFER` (1003): Self transfer not allowed
- `E_VAULT_NOT_INITIALIZED` (1004): Vault not initialized for user

#### Link Transfer Errors
- `E_INVALID_COMMITMENT` (2001): Invalid commitment hash format
- `E_LINK_EXPIRED` (2002): Link transfer has expired
- `E_ALREADY_CLAIMED` (2003): Link transfer already claimed
- `E_INVALID_SECRET` (2004): Invalid secret provided for claim
- `E_LINK_NOT_FOUND` (2005): Link transfer not found
- `E_NOT_SENDER` (2006): Only sender can refund expired link
- `E_NOT_EXPIRED` (2007): Link not yet expired, cannot refund

#### System Errors
- `E_CONTRACT_PAUSED` (3001): Contract is paused
- `E_UNAUTHORIZED` (3002): Unauthorized access
- `E_INVALID_NONCE` (3003): Invalid nonce for replay protection
- `E_ALREADY_EXISTS` (3004): Resource already exists
- `E_NOT_IMPLEMENTED` (3005): Functionality not yet implemented

### Error Getter Functions

#### Direct Transfer Error Getters
- `insufficient_balance(): u64` - Returns E_INSUFFICIENT_BALANCE
- `invalid_amount(): u64` - Returns E_INVALID_AMOUNT
- `self_transfer(): u64` - Returns E_SELF_TRANSFER
- `vault_not_initialized(): u64` - Returns E_VAULT_NOT_INITIALIZED

#### Link Transfer Error Getters
- `invalid_commitment(): u64` - Returns E_INVALID_COMMITMENT
- `link_expired(): u64` - Returns E_LINK_EXPIRED
- `already_claimed(): u64` - Returns E_ALREADY_CLAIMED
- `invalid_secret(): u64` - Returns E_INVALID_SECRET
- `link_not_found(): u64` - Returns E_LINK_NOT_FOUND
- `not_sender(): u64` - Returns E_NOT_SENDER
- `not_expired(): u64` - Returns E_NOT_EXPIRED

#### System Error Getters
- `contract_paused(): u64` - Returns E_CONTRACT_PAUSED
- `unauthorized(): u64` - Returns E_UNAUTHORIZED
- `invalid_nonce(): u64` - Returns E_INVALID_NONCE
- `already_exists(): u64` - Returns E_ALREADY_EXISTS
- `not_implemented(): u64` - Returns E_NOT_IMPLEMENTED

---

## Event Definitions

### DirectTransferEvent
```move
struct DirectTransferEvent has drop, store {
    sender: address,
    recipient: address,
    token_id: u8,
    amount: u64,
    timestamp: u64,
}
```

### LinkCreatedEvent
```move
struct LinkCreatedEvent has drop, store {
    sender: address,
    token_id: u8,
    commitment: vector<u8>,
    amount: u64,
    expiry: u64,
    object_address: address,
    timestamp: u64,
}
```

### LinkClaimedEvent
```move
struct LinkClaimedEvent has drop, store {
    claimer: address,
    sender: address,
    token_id: u8,
    amount: u64,
    commitment: vector<u8>,
    timestamp: u64,
}
```

### TokenAddedEvent
```move
struct TokenAddedEvent has drop, store {
    token_id: u8,
    name: String,
    symbol: String,
    is_coin: bool,
    timestamp: u64,
}
```

### BatchTransferEvent
```move
struct BatchTransferEvent has drop, store {
    sender: address,
    token_id: u8,
    recipients: vector<address>,
    amounts: vector<u64>,
    total_amount: u64,
    timestamp: u64,
}
```

### ClaimFAEvent
```move
struct ClaimFAEvent has drop, store {
    claimer: address,
    metadata_addr: address,
    amount: u64,
    timestamp: u64,
}
```

---

## Constants

### Module Constants
- `MAX_LINK_EXPIRY: u64 = 86400` - Maximum link expiry time (24 hours)
- `MAX_BATCH_SIZE: u64 = 100` - Maximum batch size for operations
- `TOKEN_TYPE_COIN: u8 = 1` - Token type identifier for Coin types
- `TOKEN_TYPE_FA: u8 = 2` - Token type identifier for FA tokens

### Error Code Constants
See Error Code Constants section above.

---

## Data Structures

### SupportedToken
```move
struct SupportedToken has store, drop {
    token_type: u8,      // TOKEN_TYPE_COIN or TOKEN_TYPE_FA
    name: String,
    symbol: String,
    decimals: u8,
    is_active: bool,
    coin_type_name: Option<String>,  // For Coin types
    metadata_addr: Option<address>,  // For FA tokens
}
```

### LinkTransfer
```move
struct LinkTransfer has key {
    sender: address,
    token_id: u8,
    amount: u64,
    commitment: vector<u8>,
    expiry: u64,
    nonce: u64,
    claimed: bool,
    locked_coins: Option<Coin<AptosCoin>>,
    delete_ref: DeleteRef,
}
```

### SystemState
```move
struct SystemState has key {
    paused: bool,
    admin: address,
    supported_tokens: vector<SupportedToken>,
    total_direct_transfers: u64,
    total_link_transfers: u64,
    total_claims: u64,
    token_volumes: vector<u64>,
}