# Testing Guide for Stream Basic FA

## Overview
This guide provides recommended test cases for the improved `stream_basic_fa.move` contract.

## 🧪 Test Categories

### 1. Basic Functionality Tests

#### Test: Create Stream Success
```move
#[test(deployer, sender, recipient)]
fun test_create_stream_success() {
    // Setup accounts and FA
    // Create stream with valid parameters
    // Assert stream exists
    // Assert registries updated
    // Assert initial deposit transferred
}
```

#### Test: Create Stream with Invalid Parameters
```move
#[test(deployer, sender, recipient)]
#[expected_failure(abort_code = E_INVALID_RATE)]
fun test_create_stream_rate_too_low() {
    // Attempt to create with rate < MIN_RATE
}

#[test(deployer, sender, recipient)]
#[expected_failure(abort_code = E_INVALID_AMOUNT)]
fun test_create_stream_deposit_too_low() {
    // Attempt to create with deposit < MIN_DEPOSIT
}

#[test(deployer, sender)]
#[expected_failure(abort_code = E_INVALID_RECIPIENT)]
fun test_create_stream_to_self() {
    // Attempt to create stream to own address
}
```

#### Test: Duplicate Stream Prevention
```move
#[test(deployer, sender, recipient)]
#[expected_failure(abort_code = E_STREAM_ALREADY_EXISTS)]
fun test_cannot_create_duplicate_stream() {
    // Create first stream
    // Attempt to create second stream to same recipient
    // Should abort
}
```

### 2. Withdrawal Tests

#### Test: Basic Withdrawal
```move
#[test(deployer, sender, recipient)]
fun test_withdraw_after_time() {
    // Create stream
    // Advance time by X seconds
    // Withdraw
    // Assert correct amount withdrawn
    // Assert stream still active
}
```

#### Test: Multiple Withdrawals
```move
#[test(deployer, sender, recipient)]
fun test_multiple_withdrawals() {
    // Create stream
    // Withdraw at T+10, T+20, T+30
    // Assert cumulative amounts correct
    // Assert last_withdrawal_time updates
}
```

#### Test: Withdrawal Respects End Time
```move
#[test(deployer, sender, recipient)]
fun test_withdrawal_respects_end_time() {
    // Create stream with duration = 100 seconds
    // Advance time to 150 seconds (past end_time)
    // Withdraw
    // Assert only earned up to end_time (not 150s)
}
```

#### Test: Stream Depletion
```move
#[test(deployer, sender, recipient)]
fun test_stream_depletes_correctly() {
    // Create stream with small balance, high rate
    // Advance time until depleted
    // Withdraw
    // Assert stream.is_active = false
    // Assert removed from registries
}
```

#### Test: Unauthorized Withdrawal
```move
#[test(deployer, sender, recipient, attacker)]
#[expected_failure(abort_code = E_NOT_AUTHORIZED)]
fun test_cannot_withdraw_as_non_recipient() {
    // Create stream
    // Attempt withdrawal as attacker
    // Should abort
}
```

### 3. Batch Withdrawal Tests

#### Test: Batch Withdraw Multiple Streams
```move
#[test(deployer, sender, recipient)]
fun test_batch_withdraw_success() {
    // Create 3 streams from different senders to recipient
    // Advance time
    // Batch withdraw all 3
    // Assert all withdrawn correctly
}
```

#### Test: Batch Withdraw Skips Invalid
```move
#[test(deployer, sender, recipient)]
fun test_batch_withdraw_skips_inactive() {
    // Create 2 streams, cancel 1
    // Batch withdraw both addresses
    // Assert only active one processed, no abort
}
```

### 4. Top-Up Tests

#### Test: Top-Up Success
```move
#[test(deployer, sender, recipient)]
fun test_top_up_extends_stream() {
    // Create stream
    // Top up with additional tokens
    // Assert total_deposited increased
    // Assert balance increased
}
```

#### Test: Top-Up Authorization
```move
#[test(deployer, sender, recipient, attacker)]
#[expected_failure(abort_code = E_NOT_AUTHORIZED)]
fun test_cannot_topup_as_non_sender() {
    // Create stream
    // Attempt top-up as attacker
    // Should abort
}
```

### 5. Cancellation Tests

#### Test: Cancel Stream Success
```move
#[test(deployer, sender, recipient)]
fun test_cancel_stream_distributes_correctly() {
    // Create stream with 1000 tokens
    // Advance time so 300 earned
    // Cancel
    // Assert recipient got 300
    // Assert sender got 700
    // Assert stream.is_active = false
    // Assert removed from both registries
}
```

#### Test: Cancel Non-Cancelable Stream
```move
#[test(deployer, sender, recipient)]
#[expected_failure(abort_code = E_NOT_CANCELABLE)]
fun test_cannot_cancel_non_cancelable() {
    // Create stream with is_cancelable = false
    // Attempt to cancel
    // Should abort
}
```

### 6. Registry Tests

#### Test: Sender Registry Populated
```move
#[test(deployer, sender, recipient1, recipient2)]
fun test_sender_registry_tracks_streams() {
    // Create 2 streams from sender
    // Assert get_sender_streams returns both
    // Cancel one
    // Assert get_sender_streams returns only remaining
}
```

#### Test: Recipient Registry Populated
```move
#[test(deployer, sender1, sender2, recipient)]
fun test_recipient_registry_tracks_streams() {
    // Create 2 streams to recipient
    // Assert get_recipient_streams returns both
    // Deplete one by withdrawal
    // Assert get_recipient_streams returns only active
}
```

### 7. View Function Tests

#### Test: Get Withdrawable Amount
```move
#[test(deployer, sender, recipient)]
fun test_get_withdrawable_amount() {
    // Create stream with rate = 10 tokens/sec
    // Advance 100 seconds
    // Assert get_withdrawable_amount = 1000
    // Withdraw
    // Assert get_withdrawable_amount = 0
}
```

#### Test: Get Stream Info
```move
#[test(deployer, sender, recipient)]
fun test_get_stream_info() {
    // Create stream
    // Get info
    // Assert all fields match creation parameters
}
```

#### Test: Calculate Rate Helper
```move
#[test]
fun test_calculate_rate() {
    // Test calculate_rate(2592000) = 1_000_000 (1 token/sec)
    // Test calculate_rate(259200) = 100_000 (0.1 token/sec)
    // Assert precision correct
}
```

### 8. Edge Case Tests

#### Test: Zero Duration (Unlimited Stream)
```move
#[test(deployer, sender, recipient)]
fun test_unlimited_duration_stream() {
    // Create stream with duration_seconds = 0
    // Assert end_time = 0
    // Advance far into future
    // Assert can still withdraw
}
```

#### Test: Immediate Withdrawal
```move
#[test(deployer, sender, recipient)]
#[expected_failure(abort_code = E_INSUFFICIENT_BALANCE)]
fun test_immediate_withdrawal_fails() {
    // Create stream
    // Immediately withdraw (0 time elapsed)
    // Should abort with 0 amount
}
```

#### Test: High Precision Rates
```move
#[test(deployer, sender, recipient)]
fun test_fractional_token_streaming() {
    // Create stream with very small rate
    // Advance time
    // Assert withdrawable calculated correctly
    // Test precision boundaries
}
```

#### Test: Large Amounts
```move
#[test(deployer, sender, recipient)]
fun test_large_amounts_no_overflow() {
    // Create stream with massive deposit
    // Very high rate
    // Assert no overflow in calculations
    // Test u128 intermediate calculations
}
```

### 9. Event Tests

#### Test: Stream Created Event
```move
#[test(deployer, sender, recipient)]
fun test_stream_created_event_emitted() {
    // Create stream
    // Assert StreamCreatedEvent emitted with correct data
}
```

#### Test: Withdrawal Event
```move
#[test(deployer, sender, recipient)]
fun test_withdrawal_event_emitted() {
    // Create stream
    // Withdraw
    // Assert WithdrawalEvent emitted
}
```

#### Test: Cancellation Event
```move
#[test(deployer, sender, recipient)]
fun test_cancellation_event_emitted() {
    // Create stream
    // Cancel
    // Assert StreamCancelledEvent with correct amounts
}
```

### 10. Integration Tests

#### Test: Complete Stream Lifecycle
```move
#[test(deployer, sender, recipient)]
fun test_complete_lifecycle() {
    // 1. Create stream
    // 2. Top up
    // 3. Withdraw multiple times
    // 4. Top up again
    // 5. Cancel
    // Assert all states correct throughout
}
```

#### Test: Multiple Concurrent Streams
```move
#[test(deployer, sender1, sender2, sender3, recipient)]
fun test_multiple_concurrent_streams() {
    // Create 3 streams to same recipient
    // Different rates and start times
    // Withdraw from each independently
    // Assert no interference between streams
}
```

## 🎯 Test Execution Plan

### Phase 1: Unit Tests
Run all individual function tests to verify basic behavior.

```bash
aptos move test --filter test_create
aptos move test --filter test_withdraw
aptos move test --filter test_cancel
```

### Phase 2: Integration Tests
Run lifecycle and multi-stream tests.

```bash
aptos move test --filter test_lifecycle
aptos move test --filter test_concurrent
```

### Phase 3: Gas Optimization Tests
Measure gas costs for common operations.

```bash
aptos move test --gas-report
```

### Phase 4: Fuzz Testing
Generate random inputs to find edge cases.

## 📊 Coverage Goals

Target 100% coverage of:
- ✅ All public entry functions
- ✅ All view functions
- ✅ All error paths
- ✅ All event emissions
- ✅ Edge cases (boundaries, overflows)

## 🔍 Manual Testing Checklist

On testnet:
- [ ] Create stream with real FA (USDC/APT)
- [ ] Verify time-based withdrawals work correctly
- [ ] Test batch withdrawals with keeper bot
- [ ] Verify events appear in explorer
- [ ] Test cancellation and fund distribution
- [ ] Query view functions from frontend
- [ ] Monitor gas costs for all operations
- [ ] Test with maximum number of concurrent streams

## 🐛 Known Test Requirements

1. **Timestamp Testing**: Use `timestamp::set_time_has_started_for_testing()` and `timestamp::update_global_time_for_test()`

2. **Fungible Asset Setup**: Must create test FA with proper metadata

3. **Account Funding**: Test accounts need initial token balances

4. **Event Verification**: Use event handles to verify emissions

5. **Object Addresses**: Test `get_stream_address()` for determinism

## 📝 Test Template

```move
#[test(deployer = @payroll_protocol, sender = @0x100, recipient = @0x200)]
fun test_your_feature(
    deployer: &signer,
    sender: &signer,
    recipient: &signer,
) acquires ... {
    // 1. Setup
    timestamp::set_time_has_started_for_testing(deployer);
    init_module(deployer);
    
    let sender_addr = signer::address_of(sender);
    let recipient_addr = signer::address_of(recipient);
    
    account::create_account_for_test(sender_addr);
    account::create_account_for_test(recipient_addr);
    
    // Setup FA and fund accounts
    
    // 2. Execute
    // Call your functions
    
    // 3. Assert
    // Verify expected state
}
```

---

**Next Steps:**
1. Implement all test cases
2. Run test suite
3. Fix any failures
4. Achieve 100% coverage
5. Proceed to audit
