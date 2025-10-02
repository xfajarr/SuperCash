#[test_only]
module payroll_protocol::stream_tests {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::timestamp;
    use aptos_framework::account;
    use payroll_protocol::stream_oracle_coin;
    use payroll_protocol::oracle_utils;

    // Test helper to setup accounts
    fun setup_test(aptos_framework: &signer, sender: &signer, recipient: &signer): (address, address) {
        // Initialize timestamp
        timestamp::set_time_has_started_for_testing(aptos_framework);

        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);

        // Create accounts
        account::create_account_for_test(sender_addr);
        account::create_account_for_test(recipient_addr);

        // Initialize AptosCoin
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(aptos_framework);

        // Mint coins to sender
        let coins = coin::mint(1000000000, &mint_cap); // 10 APT
        coin::deposit(sender_addr, coins);

        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);

        (sender_addr, recipient_addr)
    }

    #[test(aptos_framework = @0x1, sender = @0x100, recipient = @0x200)]
    fun test_oracle_utils_calculations(aptos_framework: &signer, sender: &signer, recipient: &signer) {
        setup_test(aptos_framework, sender, recipient);

        // Test token amount calculation
        // $5000 at $10.50 per token
        let usd_cents = 500000; // $5000
        let price = 1050000000; // $10.50 with 8 decimals
        let tokens = oracle_utils::calculate_token_amount(usd_cents, price);

        // Should be approximately 476.19 tokens
        assert!(tokens > 47600000000 && tokens < 47700000000, 0);

        // Test USD value calculation
        let token_amount = 50000000000; // 500 tokens with 8 decimals
        let usd_value = oracle_utils::calculate_usd_value(token_amount, price);

        // Should be $5250 = 525000 cents
        assert!(usd_value == 525000, 1);

        // Test rate per second
        let monthly_usd = 500000; // $5000/month
        let rate = oracle_utils::calculate_rate_per_second(monthly_usd);
        assert!(rate == 1929012, 2);

        // Test earned calculation for 1 hour (3600 seconds)
        let time_elapsed = 3600;
        let earned = oracle_utils::calculate_usd_earned(monthly_usd, time_elapsed);
        // Should be approximately $69.44
        assert!(earned > 6900 && earned < 7000, 3);
    }

    #[test(aptos_framework = @0x1, sender = @0x100, recipient = @0x200)]
    #[expected_failure(abort_code = 0x10005)] // E_INVALID_AMOUNT
    fun test_create_stream_zero_amount(aptos_framework: &signer, sender: &signer, recipient: &signer) {
        let (_sender_addr, recipient_addr) = setup_test(aptos_framework, sender, recipient);

        // Try to create stream with 0 USD amount - should fail
        stream_oracle_coin::create_stream<AptosCoin>(
            sender,
            recipient_addr,
            0, // Invalid: 0 USD
            x"0000000000000000000000000000000000000000000000000000000000000001",
            1000000,
            100000,
            0,
            true,
            0
        );
    }

    #[test]
    fun test_precision_constants() {
        let precision = oracle_utils::get_precision();
        assert!(precision == 1000000, 0);

        let max_age = oracle_utils::get_max_price_age();
        assert!(max_age == 60, 1);

        let max_deviation = oracle_utils::get_max_deviation_bps();
        assert!(max_deviation == 1000, 2); // 10%
    }

    // Note: Additional tests for stream creation, withdrawal, cancellation would require
    // mocking the Pyth oracle, which is not straightforward in Move tests.
    // These should be tested in integration tests with a testnet deployment.
}
