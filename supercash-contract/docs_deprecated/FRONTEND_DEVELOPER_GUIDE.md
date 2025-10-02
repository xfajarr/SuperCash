# Supercash Frontend Developer Guide

## Overview

This guide provides frontend developers with the necessary information to integrate with the Supercash payment system on Aptos. The system supports both FA tokens (Fungible Assets) and legacy Coin types, providing a unified interface for fast and secure payments.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Aptos TypeScript SDK
- Basic knowledge of Aptos blockchain concepts

## Installation

Install the required dependencies:

```bash
npm install @aptos-labs/ts-sdk
# or
yarn add @aptos-labs/ts-sdk
```

## Setup

### 1. Initialize Aptos Client

```typescript
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const aptosConfig = new AptosConfig({ network: Network.TESTNET }); // or Network.MAINNET
const aptos = new Aptos(aptosConfig);
```

### 2. Connect to Wallet

```typescript
import { PetraWallet } from "petra-plugin-wallet-adapter";

// Initialize wallet adapter
const wallet = new PetraWallet();
await wallet.connect();

// Get account address
const accountAddress = wallet.account.address;
```

## Core Functions

### 1. Direct Transfer

```typescript
/**
 * Transfer tokens directly from one account to another
 * @param senderAccount - Sender's account
 * @param recipientAddress - Recipient's address
 * @param tokenIndex - Index of the token in supported tokens list
 * @param amount - Amount to transfer (in smallest unit)
 */
async function directTransfer(
  senderAccount: Account,
  recipientAddress: string,
  tokenIndex: number,
  amount: number
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: senderAccount.address,
      data: {
        function: `${MODULE_ADDRESS}::payments::direct_transfer`,
        typeArguments: [],
        functionArguments: [
          recipientAddress,
          tokenIndex,
          amount
        ],
      },
    });

    const senderAuthenticator = wallet.signTransaction(transaction);
    const response = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  } catch (error) {
    console.error("Direct transfer failed:", error);
    throw error;
  }
}
```

### 2. Batch Direct Transfer

```typescript
/**
 * Transfer tokens to multiple recipients in a single transaction
 * @param senderAccount - Sender's account
 * @param recipients - Array of recipient addresses
 * @param amounts - Array of amounts corresponding to recipients
 * @param tokenIndex - Index of the token in supported tokens list
 */
async function batchDirectTransfer(
  senderAccount: Account,
  recipients: string[],
  amounts: number[],
  tokenIndex: number
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: senderAccount.address,
      data: {
        function: `${MODULE_ADDRESS}::payments::batch_direct_transfer`,
        typeArguments: [],
        functionArguments: [
          recipients,
          amounts,
          tokenIndex
        ],
      },
    });

    const senderAuthenticator = wallet.signTransaction(transaction);
    const response = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  } catch (error) {
    console.error("Batch direct transfer failed:", error);
    throw error;
  }
}
```

### 3. Create Link Transfer

```typescript
/**
 * Create a link-based transfer that can be claimed by anyone with the secret
 * @param senderAccount - Sender's account
 * @param tokenIndex - Index of the token in supported tokens list
 * @param amount - Amount to transfer
 * @param expiryHours - Hours until the link expires (max 24 hours)
 * @returns Object containing link details
 */
async function createLinkTransfer(
  senderAccount: Account,
  tokenIndex: number,
  amount: number,
  expiryHours: number = 24
) {
  try {
    // Generate a random secret (32 bytes)
    const secret = generateRandomSecret();
    
    // Calculate expiry timestamp
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (expiryHours * 3600);
    
    // Generate nonce (this would typically be done off-chain)
    const nonce = generateNonce(senderAccount.address, secret);
    
    // Create commitment
    const commitment = await createCommitment(secret, amount, nonce, expiry, senderAccount.address);
    
    const transaction = await aptos.transaction.build.simple({
      sender: senderAccount.address,
      data: {
        function: `${MODULE_ADDRESS}::payments::transfer_with_link`,
        typeArguments: [],
        functionArguments: [
          tokenIndex,
          commitment,
          amount,
          expiry
        ],
      },
    });

    const senderAuthenticator = wallet.signTransaction(transaction);
    const response = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });
    
    // Extract object address from transaction events
    const objectAddress = await extractObjectAddress(response.hash);
    
    return {
      transactionHash: response.hash,
      secret: secret,
      amount: amount,
      nonce: nonce,
      expiry: expiry,
      senderAddress: senderAccount.address,
      objectAddress: objectAddress,
      // Generate shareable link (implementation depends on your app)
      shareableLink: generateShareableLink(objectAddress, secret, amount, nonce, expiry, senderAccount.address)
    };
  } catch (error) {
    console.error("Create link transfer failed:", error);
    throw error;
  }
}

// Helper function to generate random secret
function generateRandomSecret(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to generate nonce (simplified)
function generateNonce(address: string, secret: string): number {
  // In a real implementation, this would use the same logic as the smart contract
  return parseInt(address.slice(0, 8), 16) + parseInt(secret.slice(0, 8), 16);
}

// Helper function to create commitment (simplified)
async function createCommitment(
  secret: string,
  amount: number,
  nonce: number,
  expiry: number,
  senderAddress: string
): Promise<string> {
  // In a real implementation, this would use the same hashing logic as the smart contract
  const data = secret + amount + nonce + expiry + senderAddress;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  return Array.from(new Uint8Array(hashBuffer), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Helper function to generate shareable link
function generateShareableLink(
  objectAddress: string,
  secret: string,
  amount: number,
  nonce: number,
  expiry: number,
  senderAddress: string
): string {
  const params = new URLSearchParams({
    objectAddress,
    secret,
    amount: amount.toString(),
    nonce: nonce.toString(),
    expiry: expiry.toString(),
    senderAddress
  });
  return `${window.location.origin}/claim?${params.toString()}`;
}
```

### 4. Claim Link Transfer

```typescript
/**
 * Claim tokens from a link-based transfer
 * @param claimerAccount - Account claiming the tokens
 * @param secret - Secret from the link
 * @param amount - Amount to claim
 * @param nonce - Nonce from the link
 * @param expiry - Expiry timestamp from the link
 * @param senderAddress - Sender's address from the link
 * @param objectAddress - Object address from the link
 */
async function claimLinkTransfer(
  claimerAccount: Account,
  secret: string,
  amount: number,
  nonce: number,
  expiry: number,
  senderAddress: string,
  objectAddress: string
) {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: claimerAccount.address,
      data: {
        function: `${MODULE_ADDRESS}::payments::claim_transfer_link`,
        typeArguments: [],
        functionArguments: [
          secret,
          amount,
          nonce,
          expiry,
          senderAddress,
          objectAddress
        ],
      },
    });

    const senderAuthenticator = wallet.signTransaction(transaction);
    const response = await aptos.transaction.submit.simple({
      transaction,
      senderAuthenticator,
    });

    await aptos.waitForTransaction({ transactionHash: response.hash });
    return response.hash;
  } catch (error) {
    console.error("Claim link transfer failed:", error);
    throw error;
  }
}
```

### 5. Get Supported Tokens

```typescript
/**
 * Get list of supported tokens
 * @returns Array of token information
 */
async function getSupportedTokens(): Promise<TokenInfo[]> {
  try {
    const [tokens] = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::payments::get_supported_tokens`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    // Get detailed info for each token
    const tokenPromises = tokens.map(async (index: number) => {
      const [name, symbol, decimals, isCoin, isActive] = await aptos.view({
        payload: {
          function: `${MODULE_ADDRESS}::payments::get_token_info`,
          typeArguments: [],
          functionArguments: [index],
        },
      });
      
      return {
        index,
        name,
        symbol,
        decimals,
        isCoin,
        isActive,
      };
    });

    return await Promise.all(tokenPromises);
  } catch (error) {
    console.error("Get supported tokens failed:", error);
    throw error;
  }
}

interface TokenInfo {
  index: number;
  name: string;
  symbol: string;
  decimals: number;
  isCoin: boolean;
  isActive: boolean;
}
```

### 6. Get System Statistics

```typescript
/**
 * Get system statistics
 * @returns System statistics
 */
async function getSystemStats(): Promise<SystemStats> {
  try {
    const [directTransfers, linkTransfers, claims, tokenVolumes] = await aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::payments::get_system_stats`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    return {
      directTransfers: Number(directTransfers),
      linkTransfers: Number(linkTransfers),
      claims: Number(claims),
      tokenVolumes: tokenVolumes.map((volume: any) => Number(volume)),
    };
  } catch (error) {
    console.error("Get system stats failed:", error);
    throw error;
  }
}

interface SystemStats {
  directTransfers: number;
  linkTransfers: number;
  claims: number;
  tokenVolumes: number[];
}
```

## Event Handling

### 1. Monitor Transfer Events

```typescript
/**
 * Monitor direct transfer events for an account
 * @param accountAddress - Account address to monitor
 * @param callback - Function to call when event is detected
 */
function monitorDirectTransferEvents(
  accountAddress: string,
  callback: (event: DirectTransferEvent) => void
) {
  aptos.onEvent(
    {
      eventHandle: `${MODULE_ADDRESS}::payments::DirectTransferEvent`,
      data: {
        sender: accountAddress,
      },
    },
    callback
  );
}

interface DirectTransferEvent {
  sender: string;
  recipient: string;
  token_id: number;
  amount: number;
  timestamp: number;
}
```

### 2. Monitor Link Events

```typescript
/**
 * Monitor link creation and claim events
 * @param accountAddress - Account address to monitor
 * @param callback - Function to call when event is detected
 */
function monitorLinkEvents(
  accountAddress: string,
  callback: (event: LinkCreatedEvent | LinkClaimedEvent) => void
) {
  // Monitor link creation
  aptos.onEvent(
    {
      eventHandle: `${MODULE_ADDRESS}::payments::LinkCreatedEvent`,
      data: {
        sender: accountAddress,
      },
    },
    callback
  );

  // Monitor link claims
  aptos.onEvent(
    {
      eventHandle: `${MODULE_ADDRESS}::payments::LinkClaimedEvent`,
      data: {
        sender: accountAddress,
      },
    },
    callback
  );
}

interface LinkCreatedEvent {
  sender: string;
  token_id: number;
  commitment: string;
  amount: number;
  expiry: number;
  object_address: string;
  timestamp: number;
}

interface LinkClaimedEvent {
  claimer: string;
  sender: string;
  token_id: number;
  amount: number;
  commitment: string;
  timestamp: number;
}
```

## Error Handling

### Common Error Codes

```typescript
const ERROR_CODES = {
  INSUFFICIENT_BALANCE: 1001,
  INVALID_AMOUNT: 1002,
  SELF_TRANSFER: 1003,
  INVALID_COMMITMENT: 2001,
  LINK_EXPIRED: 2002,
  ALREADY_CLAIMED: 2003,
  INVALID_SECRET: 2004,
  LINK_NOT_FOUND: 2005,
  CONTRACT_PAUSED: 3001,
  UNAUTHORIZED: 3002,
};

function getErrorMessage(errorCode: number): string {
  switch (errorCode) {
    case ERROR_CODES.INSUFFICIENT_BALANCE:
      return "Insufficient balance for this transfer";
    case ERROR_CODES.INVALID_AMOUNT:
      return "Invalid transfer amount";
    case ERROR_CODES.SELF_TRANSFER:
      return "Cannot transfer to yourself";
    case ERROR_CODES.INVALID_COMMITMENT:
      return "Invalid commitment hash";
    case ERROR_CODES.LINK_EXPIRED:
      return "This link has expired";
    case ERROR_CODES.ALREADY_CLAIMED:
      return "This link has already been claimed";
    case ERROR_CODES.INVALID_SECRET:
      return "Invalid secret for this link";
    case ERROR_CODES.LINK_NOT_FOUND:
      return "Link not found";
    case ERROR_CODES.CONTRACT_PAUSED:
      return "The contract is currently paused";
    case ERROR_CODES.UNAUTHORIZED:
      return "Unauthorized action";
    default:
      return "An unknown error occurred";
  }
}
```

## UI Components

### 1. Token Selector

```typescript
import React, { useState, useEffect } from 'react';

interface TokenSelectorProps {
  onSelectToken: (tokenIndex: number) => void;
  selectedToken?: number;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ onSelectToken, selectedToken }) => {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const supportedTokens = await getSupportedTokens();
        setTokens(supportedTokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, []);

  if (loading) {
    return <div>Loading tokens...</div>;
  }

  return (
    <select
      value={selectedToken || ''}
      onChange={(e) => onSelectToken(Number(e.target.value))}
      className="token-selector"
    >
      <option value="">Select a token</option>
      {tokens.map((token) => (
        <option key={token.index} value={token.index}>
          {token.name} ({token.symbol})
        </option>
      ))}
    </select>
  );
};
```

### 2. Link Transfer Generator

```typescript
import React, { useState } from 'react';

interface LinkTransferGeneratorProps {
  account: Account;
  tokenIndex: number;
}

const LinkTransferGenerator: React.FC<LinkTransferGeneratorProps> = ({ account, tokenIndex }) => {
  const [amount, setAmount] = useState('');
  const [expiryHours, setExpiryHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  const handleGenerateLink = async () => {
    if (!amount || isNaN(Number(amount))) {
      alert("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const result = await createLinkTransfer(
        account,
        tokenIndex,
        Number(amount) * Math.pow(10, 8), // Convert to smallest unit
        expiryHours
      );
      setLink(result.shareableLink);
    } catch (error) {
      console.error("Failed to generate link:", error);
      alert("Failed to generate payment link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="link-transfer-generator">
      <h3>Generate Payment Link</h3>
      <div className="form-group">
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
        />
      </div>
      <div className="form-group">
        <label>Expiry (hours)</label>
        <input
          type="number"
          value={expiryHours}
          onChange={(e) => setExpiryHours(Number(e.target.value))}
          min="1"
          max="24"
        />
      </div>
      <button
        onClick={handleGenerateLink}
        disabled={loading || !amount}
        className="generate-button"
      >
        {loading ? 'Generating...' : 'Generate Link'}
      </button>
      {link && (
        <div className="generated-link">
          <p>Share this link:</p>
          <input
            type="text"
            value={link}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button onClick={() => navigator.clipboard.writeText(link)}>
            Copy Link
          </button>
        </div>
      )}
    </div>
  );
};
```

### 3. Claim Link Handler

```typescript
import React, { useEffect, useState } from 'react';

const ClaimLinkHandler: React.FC = () => {
  const [params, setParams] = useState<{
    objectAddress?: string;
    secret?: string;
    amount?: string;
    nonce?: string;
    expiry?: string;
    senderAddress?: string;
  }>({});

  useEffect(() => {
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    setParams({
      objectAddress: urlParams.get('objectAddress') || undefined,
      secret: urlParams.get('secret') || undefined,
      amount: urlParams.get('amount') || undefined,
      nonce: urlParams.get('nonce') || undefined,
      expiry: urlParams.get('expiry') || undefined,
      senderAddress: urlParams.get('senderAddress') || undefined,
    });
  }, []);

  const handleClaim = async (account: Account) => {
    if (!params.objectAddress || !params.secret || !params.amount || 
        !params.nonce || !params.expiry || !params.senderAddress) {
      alert("Invalid payment link");
      return;
    }

    try {
      await claimLinkTransfer(
        account,
        params.secret,
        Number(params.amount),
        Number(params.nonce),
        Number(params.expiry),
        params.senderAddress,
        params.objectAddress
      );
      alert("Successfully claimed the payment!");
    } catch (error) {
      console.error("Failed to claim:", error);
      alert("Failed to claim payment. The link might be expired or already claimed.");
    }
  };

  if (!params.objectAddress) {
    return <div>No payment link found</div>;
  }

  return (
    <div className="claim-link-handler">
      <h3>Claim Payment</h3>
      <p>Amount: {Number(params.amount) / Math.pow(10, 8)} tokens</p>
      <button onClick={() => handleClaim(account)}>
        Claim Payment
      </button>
    </div>
  );
};
```

## Best Practices

### 1. Error Handling
- Always handle transaction errors gracefully
- Provide clear feedback to users
- Implement retry logic for network issues

### 2. User Experience
- Show loading states during transactions
- Confirm transactions before submitting
- Provide transaction status updates

### 3. Security
- Never expose private keys
- Validate all user inputs
- Use secure random number generation for secrets

### 4. Performance
- Cache token information when possible
- Use event monitoring for real-time updates
- Implement pagination for large data sets

## Testing

### 1. Unit Tests
```typescript
// Example unit test for direct transfer
describe('directTransfer', () => {
  it('should successfully transfer tokens', async () => {
    const mockAccount = createMockAccount();
    const recipientAddress = "0x123...";
    const tokenIndex = 0;
    const amount = 1000000;

    const txHash = await directTransfer(mockAccount, recipientAddress, tokenIndex, amount);
    expect(txHash).toBeDefined();
  });
});
```

### 2. Integration Tests
```typescript
// Example integration test for full flow
describe('Payment Flow', () => {
  it('should create and claim a link transfer', async () => {
    const sender = createMockAccount();
    const claimer = createMockAccount();
    
    // Create link
    const linkResult = await createLinkTransfer(sender, 0, 1000000, 24);
    
    // Claim link
    const txHash = await claimLinkTransfer(
      claimer,
      linkResult.secret,
      linkResult.amount,
      linkResult.nonce,
      linkResult.expiry,
      linkResult.senderAddress,
      linkResult.objectAddress
    );
    
    expect(txHash).toBeDefined();
  });
});
```

## Deployment

### 1. Environment Configuration
```typescript
// config.ts
export const CONFIG = {
  testnet: {
    moduleAddress: "0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0",
    network: Network.TESTNET,
  },
  mainnet: {
    moduleAddress: "0x...", // Replace with actual mainnet address
    network: Network.MAINNET,
  },
};
```

### 2. Build and Deploy
```bash
# Install dependencies
npm install

# Build the application
npm run build

# Deploy to your hosting platform
npm run deploy
```

## Support

For additional support or questions:
- Check the [GitHub Issues](https://github.com/your-repo/issues)
- Review the [Smart Contract Developer Guide](./SMART_CONTRACT_DEVELOPER_GUIDE.md)
- Join our community Discord