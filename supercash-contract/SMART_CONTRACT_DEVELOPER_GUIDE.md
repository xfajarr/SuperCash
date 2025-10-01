# Supercash Smart Contract Developer Guide

## Overview

Supercash is a high-performance payment system on Aptos that supports all FA tokens (Fungible Assets) as well as the legacy Coin types. The system is optimized for blazing fast direct transfers and secure link-based transfers with low latency and high throughput.

## Architecture

### Core Modules

The Supercash system consists of three main modules:

1. **payments.move** - Core payment functionality
2. **utils.move** - Utility functions for cryptographic operations
3. **errors.move** - Error codes and handling

### Token System

The token system is designed to dynamically handle both FA tokens and Coin types:

- **TOKEN_TYPE_COIN (1)**: Legacy Coin types like AptosCoin
- **TOKEN_TYPE_FA (2)**: Fungible Asset tokens following the new standard

### SupportedToken Struct

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

## Core Functions

### 1. direct_transfer

**Description**: High-performance direct transfer for all token types

**Parameters**:
- `sender: &signer` - The account sending the tokens
- `recipient: address` - The account receiving the tokens
- `token_index: u64` - Index of the token in the supported tokens list
- `amount: u64` - Amount to transfer

**Optimizations**:
- Minimal validation checks for speed
- Direct transfer without intermediate steps
- Leverages Aptos' parallel execution

**Example Usage**:
```move
// Transfer 1 APT (token_index 0) from Alice to Bob
payments::direct_transfer(&alice, @bob, 0, 100000000);
```

### 2. batch_direct_transfer

**Description**: Batch transfers for improved throughput

**Parameters**:
- `sender: &signer` - The account sending the tokens
- `recipients: vector<address>` - List of recipient addresses
- `amounts: vector<u64>` - Corresponding amounts for each recipient
- `token_index: u64` - Index of the token in the supported tokens list

**Optimizations**:
- Processes multiple transfers in a single transaction
- Reduces gas costs through batching
- Parallel execution of transfers

**Example Usage**:
```move
let recipients = vector::empty<address>();
vector::push_back(&mut recipients, @bob);
vector::push_back(&mut recipients, @charlie);

let amounts = vector::empty<u64>();
vector::push_back(&mut amounts, 100000000); // 1 APT to Bob
vector::push_back(&mut amounts, 200000000); // 2 APT to Charlie

payments::batch_direct_transfer(&alice, recipients, amounts, 0);
```

### 3. transfer_with_link

**Description**: Creates a link-based transfer for claiming without a recipient address

**Parameters**:
- `sender: &signer` - The account creating the link
- `token_index: u64` - Index of the token in the supported tokens list
- `commitment: vector<u8>` - 32-byte commitment hash
- `amount: u64` - Amount to transfer
- `expiry: u64` - Unix timestamp when the link expires

**Security Features**:
- Cryptographic commitment for security
- Expiration time to prevent indefinite locks
- Unique nonce for each link

**Example Usage**:
```move
let secret = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
let amount = 100000000; // 1 APT
let expiry = timestamp::now_seconds() + 3600; // 1 hour from now
let nonce = utils::generate_nonce(alice_addr, secret);
let commitment = utils::create_commitment(secret, amount, nonce, expiry, alice_addr);

payments::transfer_with_link(&alice, 0, commitment, amount, expiry);
```

### 4. claim_transfer_link

**Description**: Claims tokens from a link-based transfer

**Parameters**:
- `claimer: &signer` - The account claiming the tokens
- `secret: vector<u8>` - 32-byte secret used to create the commitment
- `amount: u64` - Amount to claim
- `nonce: u64` - Nonce used in the commitment
- `expiry: u64` - Expiration timestamp
- `sender_addr: address` - Address of the link creator
- `object_address: address` - Address of the link transfer object

**Security Verification**:
- Verifies the secret matches the commitment
- Checks the link hasn't been claimed
- Validates the link hasn't expired
- Confirms all parameters match the original values

**Example Usage**:
```move
payments::claim_transfer_link(
    &bob, 
    secret, 
    amount, 
    nonce, 
    expiry, 
    alice_addr, 
    object_address
);
```

### 5. add_fa_token

**Description**: Adds a new FA token to the supported tokens list (Admin only)

**Parameters**:
- `admin: &signer` - Admin account
- `name: String` - Name of the token
- `symbol: String` - Symbol of the token
- `decimals: u8` - Number of decimal places
- `metadata_addr: address` - Address of the token's metadata object

**Example Usage**:
```move
payments::add_fa_token(
    &admin,
    string::utf8(b"USD Coin"),
    string::utf8(b"USDC"),
    6,
    @0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
);
```

## Utility Functions (utils.move)

### create_commitment

**Description**: Creates a cryptographic commitment for link-based transfers

**Parameters**:
- `secret: vector<u8>` - 32-byte secret
- `amount: u64` - Transfer amount
- `nonce: u64` - Unique nonce
- `expiry: u64` - Expiration timestamp
- `sender_addr: address` - Sender's address

**Returns**: `vector<u8>` - 32-byte SHA3-256 hash

### verify_commitment

**Description**: Verifies a commitment against provided parameters

**Parameters**: Same as `create_commitment`

**Returns**: `bool` - True if commitment is valid

### generate_nonce

**Description**: Generates a secure nonce using block information and entropy

**Parameters**:
- `sender: address` - Sender's address
- `extra_entropy: vector<u8>` - Additional entropy

**Returns**: `u64` - Generated nonce

## Error Handling

All errors are defined in `errors.move` with specific error codes:

### Direct Transfer Errors
- `E_INSUFFICIENT_BALANCE (1001)`: Insufficient balance for the transfer
- `E_INVALID_AMOUNT (1002)`: Invalid transfer amount (zero or negative)
- `E_SELF_TRANSFER (1003)`: Self transfer not allowed

### Link Transfer Errors
- `E_INVALID_COMMITMENT (2001)`: Invalid commitment hash format
- `E_LINK_EXPIRED (2002)`: Link transfer has expired
- `E_ALREADY_CLAIMED (2003)`: Link transfer already claimed
- `E_INVALID_SECRET (2004)`: Invalid secret provided for claim
- `E_LINK_NOT_FOUND (2005)`: Link transfer not found
- `E_NOT_SENDER (2006)`: Only sender can refund expired link
- `E_NOT_EXPIRED (2007)`: Link not yet expired, cannot refund

### System Errors
- `E_CONTRACT_PAUSED (3001)`: Contract is paused
- `E_UNAUTHORIZED (3002)`: Unauthorized access
- `E_INVALID_NONCE (3003)`: Invalid nonce for replay protection
- `E_ALREADY_EXISTS (3004)`: Resource already exists
- `E_NOT_IMPLEMENTED (3005)`: Functionality not yet implemented

## Events

### DirectTransferEvent
Emitted when a direct transfer is completed.

### LinkCreatedEvent
Emitted when a link-based transfer is created.

### LinkClaimedEvent
Emitted when a link-based transfer is claimed.

### TokenAddedEvent
Emitted when a new token is added to the system.

### BatchTransferEvent
Emitted when a batch transfer is completed.

### ClaimFAEvent
Emitted when an FA token link is claimed (for off-chain processing).

## Deployment

### Prerequisites
- Aptos CLI installed
- Node.js for TypeScript SDK (optional)

### Deployment Steps

1. Compile the contract:
```bash
aptos move compile
```

2. Deploy the contract:
```bash
aptos move deploy --profile testnet  # or mainnet
```

3. Initialize the contract (automatic on first deployment)

### Testing

Run the test suite:
```bash
aptos move test
```

## Performance Optimizations

### Low Latency
- Minimal validation checks
- Direct transfers without intermediate steps
- Optimized gas usage

### High Throughput
- Batch processing for multiple transfers
- Parallel execution capabilities
- Efficient state management

### Security Considerations
- Cryptographic commitments for link-based transfers
- Proper error handling and validation
- Admin-only functions for critical operations

## Future Enhancements

1. **Dynamic Coin Type Support**: Add reflection capabilities to handle any Coin type dynamically
2. **Enhanced FA Token Handling**: Improve the FA token claiming mechanism with proper signing
3. **Cross-Chain Support**: Extend to support tokens from other blockchains
4. **Advanced Batch Operations**: Add more sophisticated batch processing options
5. **Fee Mechanisms**: Implement protocol fees for certain operations

## Integration Guide

For frontend integration, refer to the `FRONTEND_DEVELOPER_GUIDE.md` for detailed instructions on integrating with the Supercash system.