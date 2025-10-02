# SuperCash Contract - Aptos Explorer Testing Guide

This guide will walk you through deploying the SuperCash contract to Aptos and testing it using the Aptos Explorer interface.

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Aptos CLI installed
- ✅ A wallet with some APT for gas fees
- ✅ Basic understanding of Move smart contracts

## 🔧 Environment Setup

### Step 1: Install Aptos CLI (if not already installed)

```powershell
# Using Windows Package Manager
winget install aptos-labs.aptos-cli

# Or using Chocolatey
choco install aptos-cli

# Verify installation
aptos --version
```

### Step 2: Initialize Aptos Account

```powershell
# Navigate to your contract directory
cd "D:\Hackathon\supercash\supercash-contract"

# Initialize new profile for testing
aptos init --profile supercash-test
```

When prompted:
- Choose **devnet** for testing
- Choose to **create a new account**
- Save the private key safely (you'll need it later)

### Step 3: Fund Your Account

```powershell
# Fund your account with test APT
aptos account fund-with-faucet --profile supercash-test

# Check balance
aptos account list --profile supercash-test
```

## 🚀 Contract Deployment

### Step 1: Compile the Contract

```powershell
# Compile contract to check for errors
aptos move compile --profile supercash-test

# You should see successful compilation with module addresses
```

### Step 2: Deploy to Devnet

```powershell
# Deploy the contract
aptos move publish --profile supercash-test

# Save the transaction hash and package address from the output
```

**Important**: Note down the **package address** from the deployment output - you'll need this for testing!

### Step 3: Verify Deployment

```powershell
# Check your account to see deployed modules
aptos account list --profile supercash-test
```

## 🌐 Testing on Aptos Explorer

### Opening Aptos Explorer

1. Go to [Aptos Explorer](https://explorer.aptoslabs.com/)
2. Make sure you're on **Devnet** (top right corner)
3. Search for your account address (from `aptos account list`)

### Viewing Your Contract

1. In explorer, go to your account page
2. Click on **"Modules"** tab
3. You should see three modules:
   - `supercash::payments`
   - `supercash::utils` 
   - `supercash::errors`

## 🧪 Testing Contract Functions

### Test 1: Direct APT Transfer

Let's test the basic APT transfer function:

1. **Open Run Function Interface**:
   - Go to Explorer → Your Account → Modules → `payments`
   - Find `direct_transfer_apt` function
   - Click **"Run Function"**

2. **Function Parameters**:
   ```
   Function: 0xYOUR_ADDRESS::payments::direct_transfer_apt
   recipient: 0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8
   amount: 1000000 (0.01 APT in octas)
   ```

3. **Connect Wallet**:
   - Click "Connect Wallet"
   - Choose your wallet (Petra, Martian, etc.)
   - Approve the transaction

4. **View Results**:
   - Check transaction status in explorer
   - Verify APT was transferred to recipient

### Test 2: Create Link Transfer

Test the link-based payment system:

1. **Prepare Commitment** (use this example):
   ```
   commitment: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
   amount: 5000000 (0.05 APT)
   expiry: 1735689600 (Jan 1, 2025 timestamp)
   ```

2. **Run Function**:
   ```
   Function: 0xYOUR_ADDRESS::payments::transfer_with_link_apt
   commitment: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]
   amount: 5000000
   expiry: 1735689600
   ```

3. **Note Object Address**:
   - Check transaction events for `LinkCreatedEvent`
   - Note the `object_address` field

### Test 3: View Contract Statistics

Check the contract's performance metrics:

1. **Run View Function**:
   ```
   Function: 0xYOUR_ADDRESS::payments::get_system_stats
   (No parameters needed)
   ```

2. **Expected Output**:
   ```
   [
     "1",     // total_direct_transfers
     "1",     // total_link_transfers  
     "0",     // total_claims
     ["6000000", "0", "0", "0"]  // token_volumes [APT, USDC, PYUSD, USDT]
   ]
   ```

### Test 4: Check Supported Tokens

Verify which tokens are active:

1. **Run View Function**:
   ```
   Function: 0xYOUR_ADDRESS::payments::get_supported_tokens
   (No parameters needed)
   ```

2. **Expected Output**:
   ```
   [1]  // Only APT (token ID 1) is active by default
   ```

### Test 5: Get Token Information

Check details about APT token:

1. **Run View Function**:
   ```
   Function: 0xYOUR_ADDRESS::payments::get_token_info
   token_id: 1
   ```

2. **Expected Output**:
   ```
   [
     "Aptos Coin",  // name
     "APT",         // symbol
     8,             // decimals
     true,          // is_coin
     true           // is_active
   ]
   ```

## 🔗 Advanced Testing: Batch Transfers

Test the batch transfer functionality:

### Batch APT Transfer

1. **Prepare Recipients and Amounts**:
   ```
   recipients: [
     "0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8",
     "0x123d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8"
   ]
   amounts: [2000000, 3000000]  // 0.02 APT and 0.03 APT
   ```

2. **Run Function**:
   ```
   Function: 0xYOUR_ADDRESS::payments::batch_direct_transfer_apt
   recipients: ["0x742d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8","0x123d35cc6efe252d8c85a7bd67a88e198faa5c60d4f9b5e6b2bb14a3d0b6e5c8"]
   amounts: [2000000, 3000000]
   ```

## 📊 Monitoring and Analytics

### View Transaction Events

After each transaction:

1. **Click on Transaction Hash** in explorer
2. **Go to "Events" tab**
3. **Look for SuperCash Events**:
   - `DirectTransferEvent`
   - `LinkCreatedEvent` 
   - `BatchTransferEvent`

### Sample Event Structure

```json
{
  "type": "0xYOUR_ADDRESS::payments::DirectTransferEvent",
  "data": {
    "sender": "0xYOUR_ADDRESS",
    "recipient": "0xRECIPIENT_ADDRESS", 
    "token_id": 1,
    "amount": "1000000",
    "timestamp": "1704067200"
  }
}
```

## 🛠️ Troubleshooting

### Common Issues

1. **"Insufficient Balance" Error**:
   ```powershell
   # Fund your account again
   aptos account fund-with-faucet --profile supercash-test
   ```

2. **"Module Not Found" Error**:
   - Verify contract was deployed successfully
   - Check the correct package address
   - Ensure you're using the right network (devnet)

3. **"Invalid Commitment" Error**:
   - Ensure commitment is exactly 32 bytes
   - Use the example commitment provided above

4. **Gas Estimation Errors**:
   ```powershell
   # Check account balance
   aptos account list --profile supercash-test
   
   # Fund if needed
   aptos account fund-with-faucet --profile supercash-test
   ```

### Debugging Commands

```powershell
# View transaction details
aptos move view --function-id "0xYOUR_ADDRESS::payments::get_system_stats" --profile supercash-test

# Check account resources
aptos account list --profile supercash-test

# View specific transaction
aptos node analyze-validators --url https://fullnode.devnet.aptoslabs.com/v1
```

## 🎯 Testing Checklist

Use this checklist to ensure comprehensive testing:

- [ ] ✅ Contract deployed successfully
- [ ] ✅ Direct APT transfer works
- [ ] ✅ Batch APT transfer works  
- [ ] ✅ Link transfer creation works
- [ ] ✅ System stats are updated correctly
- [ ] ✅ Token info returns correct data
- [ ] ✅ Events are emitted properly
- [ ] ✅ Error handling works (try invalid inputs)

## 📱 Testing with Frontend

### Using the TypeScript SDK

If you want to test programmatically:

1. **Install Dependencies**:
   ```bash
   npm install aptos crypto-js
   ```

2. **Use the SDK** (from `examples/typescript-sdk.ts`):
   ```typescript
   import SuperCashClient, { TokenId } from './examples/typescript-sdk';
   
   const client = new SuperCashClient("https://fullnode.devnet.aptoslabs.com/v1");
   
   // Your contract address from deployment
   const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_ADDRESS";
   ```

## 🔒 Security Testing

### Test Invalid Scenarios

1. **Try transferring 0 APT** (should fail)
2. **Try self-transfer** (should fail)
3. **Try transfer without balance** (should fail)
4. **Try claiming with wrong secret** (should fail)
5. **Try expired link operations** (should fail)

## 📈 Performance Testing

### Gas Usage Analysis

Monitor gas consumption in explorer:

- **Direct Transfer**: ~300-500 gas
- **Link Creation**: ~600-900 gas
- **Link Claim**: ~700-1000 gas
- **Batch Transfer**: ~400-600 gas per transfer

## 🚀 Next Steps

Once testing is complete:

1. **Deploy to Testnet**:
   ```powershell
   aptos init --profile supercash-testnet --network testnet
   aptos move publish --profile supercash-testnet
   ```

2. **Configure FA Tokens**:
   - Get metadata addresses for USDC, PYUSD, USDT
   - Use `set_fa_token_metadata` function

3. **Production Deployment**:
   - Deploy to mainnet
   - Set up monitoring
   - Configure frontend integration

## 📞 Support

If you encounter issues:

1. **Check Explorer**: Transaction details and error messages
2. **Verify Balance**: Ensure sufficient APT for gas
3. **Double-check Addresses**: Copy-paste to avoid typos
4. **Review Logs**: Check terminal output for error details

## 🎉 Success!

You've successfully deployed and tested the SuperCash contract on Aptos! The contract is now ready for:

- ✅ Frontend integration
- ✅ Multi-token support setup  
- ✅ Production deployment
- ✅ Advanced features development

---

**Happy Testing!** 🚀 Your blazing-fast payments system is live on Aptos!