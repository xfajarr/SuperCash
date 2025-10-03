# SuperCash Money Streaming Guide

## Overview

SuperCash Money Streaming enables continuous payment flows between users on the Aptos blockchain. Recipients see funds accumulate in real-time, making it perfect for salaries, subscriptions, and any scenario requiring time-based payments.

## Contract Information

**Contract Address**: `0x504a0ae5e2d680cfd31b90a47f576088828483e1e4721efb0619ffa60ca94d61`
**Module**: `money_stream`
**Network**: Testnet (extensible to mainnet)

## Key Features

- 🌊 **Real-time streaming**: Funds flow continuously by the second
- ⏸️ **Pause/Resume**: Stream creators can pause and resume payments
- 🎯 **Cliff periods**: Optional vesting cliffs before streaming starts
- 🪙 **Multi-token support**: APT (Coin) and Fungible Assets (USDC, USDT, PYUSD)
- 📊 **Real-time UI**: Live tickers showing accumulating amounts
- 🔧 **Flexible rates**: Define flow rates by second, hour, day, week, or month

## Architecture

### Core Components

1. **StreamingClient** (`/src/sdk/streamingClient.ts`)
   - TypeScript wrapper for contract interactions
   - Payload generators for all stream operations
   - Helper functions for calculations and validations

2. **useMoneyStream Hook** (`/src/hooks/useMoneyStream.ts`)
   - React hook for stream state management
   - Optimistic updates and caching
   - Event listening and real-time refreshes

3. **StreamCard Component** (`/src/components/StreamCard.tsx`)
   - Individual stream display with actions
   - Real-time amount ticker
   - Status badges and progress indicators

4. **StreamingAmountTicker** (`/src/components/StreamingAmountTicker.tsx`)
   - Real-time amount display with animations
   - Handles pause/resume states correctly
   - Customizable decimal precision and tokens

## Quick Start

### 1. Initialize the Hook

```tsx
import { useMoneyStream } from '@/hooks/useMoneyStream';

function StreamingApp() {
  const {
    createStreamByRateCoin,
    createStreamByRateFa,
    activeStreams,
    incomingStreams,
    pauseStreamCoin,
    resumeStreamCoin,
    cancelStreamCoin,
    // ... other functions
  } = useMoneyStream();
  
  // Your streaming app logic here
}
```

### 2. Create a Stream

```tsx
// For APT (Coin)
const createAPTStream = async () => {
  const result = await createStreamByRateCoin(
    "0xrecipient_address",     // recipient
    100000000,                 // 1 APT per hour (in octas)
    UNIT_HOUR,                 // interval unit
    86400,                     // 24 hours duration
    0,                         // no cliff
    "0x1::aptos_coin::AptosCoin"
  );
  
  if (result.success) {
    console.log("Stream created successfully!");
  }
};

// For USDC (Fungible Asset)
const createUSDCStream = async () => {
  const result = await createStreamByRateFa(
    "0xrecipient_address",
    "0xusdc_metadata_address",
    100000,                    // $100 per day (6 decimals)
    UNIT_DAY,
    604800,                    // 1 week duration
    0,                         // no cliff
  );
};
```

### 3. Display Streams

```tsx
import { StreamCard } from '@/components/StreamCard';

function MyStreams() {
  const { activeStreams, pauseStreamCoin, resumeStreamCoin } = useMoneyStream();

  return (
    <div className="space-y-4">
      {activeStreams.map((stream) => (
        <StreamCard
          key={stream.id}
          stream={stream}
          isOutgoing={true}
          onPause={(id) => pauseStreamCoin(id, stream.coinType!)}
          onResume={(id) => resumeStreamCoin(id, stream.coinType!)}
          isLoading={false}
        />
      ))}
    </div>
  );
}
```

## API Reference

### StreamingClient Class

#### Core Methods

```typescript
// Stream Creation
getCreateStreamByRateCoinPayload(
  recipient: string,
  amountPerInterval: number,
  intervalUnit: number,
  durationSeconds: number,
  cliffDurationSeconds: number,
  coinType: string
): TransactionPayload

getCreateStreamByRateFaPayload(
  recipient: string,
  metadataAddress: string,
  amountPerInterval: number,
  intervalUnit: number,
  durationSeconds: number,
  cliffDurationSeconds: number
): TransactionPayload

// Stream Management
getPauseStreamCoinPayload(streamId: number, coinType: string)
getResumeStreamCoinPayload(streamId: number, coinType: string)
getCancelStreamCoinPayload(senderAddress: string, streamId: number, coinType: string)

// View Functions
getClaimableAmountCoin(senderAddress: string, streamId: number, coinType: string): Promise<number>
getFlowRateCoin(senderAddress: string, streamId: number, coinType: string): Promise<FlowRate>
```

#### Helper Functions

```typescript
static calculateClaimableAmount(stream: Partial<Stream>): number
static isStreamActive(stream: Partial<Stream>): boolean
static isStreamExpired(stream: Partial<Stream>): boolean
static getSecondsPerInterval(intervalUnit: number): number
static calculateFlowRate(amountPerInterval: number, intervalUnit: number): number
```

### Event Types

```typescript
interface StreamCreatedEvent {
  stream_id: number;
  sender: string;
  recipient: string;
  total_amount: number;
  start_time: number;
  end_time: number;
  cliff_timestamp: number;
  asset_type: string;
  timestamp: number;
}

interface StreamWithdrawnEvent {
  stream_id: number;
  recipient: string;
  withdrawn_amount: number;
  timestamp: number;
}

interface StreamPausedEvent {
  stream_id: number;
  timestamp: number;
}
```

## Contract Functions

### Entry Functions

| Function | Description | Parameters |
|----------|-------------|------------|
| `create_stream_by_rate_coin` | Create coin stream by rate | recipient, amount_per_interval, interval_unit, duration_seconds, cliff_duration_seconds |
| `create_stream_by_rate_fa` | Create FA stream by rate | recipient, metadata_addr, amount_per_interval, interval_unit, duration_seconds, cliff_duration_seconds |
| `withdraw_from_stream_coin` | Withdraw from coin stream | sender_addr, stream_id |
| `pause_stream_coin` | Pause coin stream | stream_id |
| `resume_stream_coin` | Resume coin stream | stream_id |
| `cancel_stream_coin` | Cancel coin stream | sender_addr, stream_id |

### View Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `view_claimable_amount_coin` | Get claimable amount | u64 |
| `get_flow_rate_coin` | Get flow rates | (u128, u128, u128, u128, u128, u128) |
| `get_stream_details_coin` | Get stream details | StreamDetails |

### Interval Units

```move
const UNIT_HOUR: u8 = 1;
const UNIT_DAY: u8 = 2;
const UNIT_WEEK: u8 = 3;
const UNIT_MONTH: u8 = 4; // 30-day month
```

## Real-Time UI Principles

### 1. Accurate Time Calculations

```typescript
// Account for pauses in calculations
let effectiveTime = now;
if (!stream.isActive && stream.lastPauseTime) {
  effectiveTime = stream.lastPauseTime;
}

const timeElapsed = effectiveTime - stream.startTime - pauseOffsets;
const earned = timeElapsed * stream.flowRate.ratePerSecond;
```

### 2. Smooth Animations

```typescript
// Use requestAnimationFrame for smooth updates
const updateAmount = () => {
  const newAmount = calculateCurrentAmount();
  setCurrentAmount(newAmount);
  animationFrameRef.current = requestAnimationFrame(updateAmount);
};
```

### 3. State Management

- **Optimistic Updates**: Update UI immediately, sync with blockchain later
- **Caching**: Cache stream data for 30 seconds to reduce RPC calls
- **Event Listening**: Poll for new events every 60 seconds

## Testing

### Unit Tests

```typescript
describe('StreamingClient', () => {
  it('should calculate claimable amount correctly', () => {
    const stream = {
      startTime: 1000,
      endTime: 2000,
      totalAmount: 1000,
      flowRate: { ratePerSecond: 1 },
      withdrawnAmount: 0,
      isActive: true
    };
    
    // Mock current time to 1500 (halfway through stream)
    jest.spyOn(Date, 'now').mockReturnValue(1500000);
    
    const claimable = StreamingClient.calculateClaimableAmount(stream);
    expect(claimable).toBe(500); // 500 seconds * 1 token/second
  });
});
```

### E2E Testing Scenarios

1. **Create Stream**: Verify stream appears in "sending" list with correct ticker
2. **Pause Stream**: Verify ticker stops and status updates
3. **Resume Stream**: Verify ticker continues from correct amount
4. **Cancel Stream**: Verify stream disappears and balances adjust
5. **Claim Stream**: Verify recipient can withdraw accumulated funds

## Environment Configuration

Create a `.env` file with:

```bash
VITE_NODIT_API_KEY_TESTNET=your_testnet_key
VITE_NODIT_API_KEY_MAINNET=your_mainnet_key
```

## Error Handling

```typescript
// Common error patterns
try {
  const result = await createStreamByRateCoin(/* params */);
  if (!result.success) {
    toast.error(`Stream creation failed: ${result.error?.message}`);
  }
} catch (error) {
  console.error('Unexpected error:', error);
  toast.error('An unexpected error occurred');
}
```

## Performance Considerations

1. **Debounced Updates**: Avoid excessive state updates during real-time ticking
2. **Efficient Calculations**: Cache expensive calculations and only recalculate when needed
3. **Memory Management**: Clean up animation frames and intervals on component unmount
4. **Batch Operations**: Group multiple stream operations where possible

## Future Enhancements

- **Cross-chain streaming**: Extend to other blockchains
- **Dynamic rate adjustments**: Allow rate changes mid-stream
- **Conditional streaming**: Streams triggered by external events
- **Advanced analytics**: Detailed stream performance metrics
- **Mobile optimization**: Native mobile app with background updates

## Support

For questions and issues:
- GitHub: [SuperCash Repository](https://github.com/supercash/aptos-contract)
- Discord: [SuperCash Community](https://discord.gg/supercash)
- Documentation: [SuperCash Docs](https://docs.supercash.money)

---

**SuperCash Money Streaming** - Revolutionizing continuous payments on Aptos 🌊