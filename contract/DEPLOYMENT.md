# Supercash Deployment Guide

## Overview
Supercash is a USD-denominated payroll streaming protocol on Aptos that uses Pyth Network oracles for real-time price feeds.

## Pre-Deployment Checklist

### 1. Update Move.toml Configuration

#### For Testnet Deployment:
```toml
[addresses]
payroll_protocol = "_"  # Will be assigned during deployment
pyth = "0x..." # Get from https://docs.pyth.network/price-feeds/contract-addresses/aptos
deployer = "YOUR_DEPLOYER_ADDRESS"
wormhole = "0x..." # Get from https://docs.wormhole.com/wormhole/reference/contract-addresses
```

#### Get Testnet Addresses:
1. **Pyth Oracle Testnet**: Visit https://docs.pyth.network/price-feeds/contract-addresses/aptos
2. **Wormhole Testnet**: Visit https://docs.wormhole.com/wormhole/reference/contract-addresses

### 2. Verify Oracle Integration

Before deploying, verify that:
- [ ] Pyth price feeds are available for your required assets (APT, BTC, ETH, etc.)
- [ ] Price feed IDs are documented
- [ ] Update fees are understood

## Deployment Steps

### Step 1: Compile the Contract
```bash
aptos move compile --named-addresses payroll_protocol=default
```

### Step 2: Run Tests
```bash
aptos move test
```

### Step 3: Deploy to Testnet
```bash
# Initialize Aptos CLI with testnet
aptos init --network testnet

# Publish the module
aptos move publish \
  --named-addresses payroll_protocol=default,deployer=YOUR_ADDRESS \
  --network testnet \
  --assume-yes
```

### Step 4: Verify Deployment
```bash
# Check if module is deployed
aptos account list --query modules --account YOUR_ADDRESS
```

## Post-Deployment Configuration

### 1. Initialize Sender Account
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::init_sender' \
  --assume-yes
```

### 2. Initialize Recipient Account
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::init_recipient' \
  --assume-yes
```

## Creating a Stream

### Required Information:
- **usd_amount_per_month**: Salary in USD cents (e.g., 500000 = $5,000/month)
- **price_feed_id**: Pyth price feed ID for the asset (get from https://pyth.network/developers/price-feed-ids)
- **initial_deposit**: Initial token amount to fund the stream
- **fee_reserve_amount**: APT amount reserved for oracle update fees
- **duration_seconds**: Stream duration (0 = indefinite)
- **is_cancelable**: Whether sender can cancel
- **min_balance_usd**: Low balance threshold for alerts

### Example: Create APT Stream for $5,000/month

```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::create_stream' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args \
    address:RECIPIENT_ADDRESS \
    u64:500000 \
    hex:PYTH_APT_USD_FEED_ID \
    u64:1000000000 \
    u64:10000000 \
    u64:0 \
    bool:true \
    u64:50000 \
  --assume-yes
```

## Pyth Price Feed IDs (Examples)

**Note**: Get the latest feed IDs from https://pyth.network/developers/price-feed-ids

Common feeds:
- APT/USD: `0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5`
- BTC/USD: `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`
- ETH/USD: `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`

## Stream Operations

### Withdraw from Stream
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::withdraw' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args \
    address:STREAM_ADDRESS \
    'vector<vector<u8>>':PRICE_UPDATE_DATA \
  --assume-yes
```

### Top Up Stream Balance
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::top_up' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args \
    address:STREAM_ADDRESS \
    u64:AMOUNT \
  --assume-yes
```

### Top Up Fee Reserve
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::top_up_fee_reserve' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args \
    address:STREAM_ADDRESS \
    u64:AMOUNT \
  --assume-yes
```

### Cancel Stream
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::cancel_stream' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args address:STREAM_ADDRESS \
  --assume-yes
```

### Emergency Pause/Unpause
```bash
aptos move run \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::set_emergency_pause' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args \
    address:STREAM_ADDRESS \
    bool:true \
  --assume-yes
```

## View Functions

### Get Withdrawable Amount (USD)
```bash
aptos move view \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::get_withdrawable_usd' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args address:STREAM_ADDRESS
```

### Get Stream Info
```bash
aptos move view \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::get_stream_info' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args address:STREAM_ADDRESS
```

### Get Fee Reserve Balance
```bash
aptos move view \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::get_fee_reserve_balance' \
  --type-args '0x1::aptos_coin::AptosCoin' \
  --args address:STREAM_ADDRESS
```

### Calculate Stream Address
```bash
aptos move view \
  --function-id 'YOUR_ADDRESS::stream_oracle_coin::get_stream_address' \
  --args \
    address:SENDER_ADDRESS \
    address:RECIPIENT_ADDRESS \
    u64:STREAM_ID
```

## Security Considerations

1. **Fee Reserve Management**: Always ensure adequate fee reserve for oracle updates
2. **Price Feed Validation**: Verify price feed IDs before creating streams
3. **Oracle Downtime**: System uses last known price as fallback
4. **Stream Limits**: One sender can create multiple streams to same recipient (via stream_id)
5. **Emergency Controls**: Sender can pause streams if needed

## Troubleshooting

### Common Issues:

**E_INVALID_PRICE_FEED (11)**: Price feed doesn't exist
- Solution: Verify price feed ID from Pyth documentation

**E_INSUFFICIENT_FEE_RESERVE (12)**: Not enough APT for oracle fees
- Solution: Top up fee reserve using `top_up_fee_reserve`

**E_INSUFFICIENT_BALANCE (8)**: Stream has insufficient tokens
- Solution: Top up stream using `top_up`

## Monitoring

Monitor your streams for:
- Low balance events
- Fee reserve depletion
- Oracle price updates
- Withdrawal activity

## Support

For issues:
1. Check Pyth Network status: https://pyth.network/
2. Check Aptos testnet status: https://status.aptoslabs.com/
3. Review transaction logs in Aptos Explorer

## Additional Resources

- Pyth Network Docs: https://docs.pyth.network/
- Aptos Move Docs: https://aptos.dev/move/move-on-aptos/
- Wormhole Docs: https://docs.wormhole.com/
