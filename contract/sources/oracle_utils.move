/// Shared oracle utilities for both Coin and FA implementations
module payroll_protocol::oracle_utils {
    use pyth::price::{Self, Price};
    use pyth::i64::{Self};

    // ===== ERRORS =====
    const E_STALE_PRICE: u64 = 1;
    const E_PRICE_DEVIATION_TOO_HIGH: u64 = 2;
    const E_INVALID_PRICE: u64 = 3;
    const E_NEGATIVE_PRICE: u64 = 4;

    // ===== CONSTANTS =====
    const PRECISION: u64 = 1_000_000;
    const USD_CENTS: u64 = 100;
    const PYTH_PRICE_DECIMALS: u64 = 8;
    const MAX_PRICE_AGE_SECONDS: u64 = 60;
    const MAX_DEVIATION_BPS: u64 = 1000; // 10%

    // ===== CALCULATION FUNCTIONS =====

    /// Calculate token amount needed for given USD value
    /// usd_cents: Amount in USD cents (e.g., 500000 = $5000.00)
    /// price: Price from Pyth with 8 decimals (e.g., 1050000000 = $10.50)
    /// Returns: Token amount with proper decimals
    public fun calculate_token_amount(usd_cents: u64, price: u64): u64 {
        // Formula: (usd_cents * 10^8) / (price * 100)
        // Example: ($5000 * 10^8) / ($10.50 * 100) = 476.19 tokens
        
        let numerator = (usd_cents as u128) * (PYTH_PRICE_DECIMALS as u128) * 10u128;
        let denominator = (price as u128) * (USD_CENTS as u128);
        
        ((numerator / denominator) as u64)
    }

    /// Calculate USD value of token amount
    /// token_amount: Amount of tokens
    /// price: Price from Pyth with 8 decimals
    /// Returns: USD value in cents
    public fun calculate_usd_value(token_amount: u64, price: u64): u64 {
        // Formula: (token_amount * price * 100) / 10^8
        
        let numerator = (token_amount as u128) * (price as u128) * (USD_CENTS as u128);
        let denominator = (PYTH_PRICE_DECIMALS as u128) * 10u128;
        
        ((numerator / denominator) as u64)
    }

    /// Calculate monthly USD amount to rate per second
    /// usd_per_month: USD amount per month in cents
    /// Returns: Rate per second with precision
    public fun calculate_rate_per_second(usd_per_month: u64): u64 {
        let seconds_per_month = 30 * 24 * 60 * 60; // 2,592,000
        ((usd_per_month as u128) * (PRECISION as u128) / (seconds_per_month as u128)) as u64
    }

    /// Calculate earned USD for time period
    /// usd_per_month: Monthly USD amount in cents
    /// time_elapsed: Seconds elapsed
    /// Returns: USD earned in cents
    public fun calculate_usd_earned(usd_per_month: u64, time_elapsed: u64): u64 {
        let seconds_per_month = 30 * 24 * 60 * 60;
        ((time_elapsed as u128) * (usd_per_month as u128) / (seconds_per_month as u128)) as u64
    }

    // ===== PRICE VALIDATION =====

    /// Extract and normalize price value from Pyth Price struct
    /// Returns price normalized to 8 decimals
    public fun extract_price_value(price: &Price): u64 {
        let price_val = price::get_price(price);
        let expo = price::get_expo(price);
        
        let price_val_u64 = i64::get_magnitude_if_positive(&price_val);
        assert!(price_val_u64 > 0, E_NEGATIVE_PRICE);
        
        // Normalize to 8 decimals
        if (i64::get_magnitude_if_positive(&expo) > 0) {
            let expo_u64 = i64::get_magnitude_if_positive(&expo);
            (price_val_u64 * pow10(expo_u64))
        } else {
            let abs_expo = i64::get_magnitude_if_negative(&expo);
            if (abs_expo >= 8) {
                (price_val_u64 / pow10(abs_expo - 8))
            } else {
                (price_val_u64 * pow10(8 - abs_expo))
            }
        }
    }

    /// Validate price is not stale
    public fun validate_price_freshness(price: &Price, current_time: u64) {
        let publish_time = price::get_timestamp(price);
        let age = current_time - (publish_time as u64);
        
        assert!(age <= MAX_PRICE_AGE_SECONDS, E_STALE_PRICE);
    }

    /// Check price hasn't deviated too much
    public fun check_price_deviation(old_price: u64, new_price: u64, max_deviation_bps: u64) {
        if (old_price == 0) { return }; // First price
        
        let diff = if (new_price > old_price) {
            new_price - old_price
        } else {
            old_price - new_price
        };
        
        let deviation_bps = ((diff as u128) * 10000u128 / (old_price as u128));
        assert!((deviation_bps as u64) <= max_deviation_bps, E_PRICE_DEVIATION_TOO_HIGH);
    }

    /// Full price validation
    public fun validate_price(price: &Price, old_price: u64, current_time: u64, max_deviation_bps: u64): u64 {
        validate_price_freshness(price, current_time);
        let new_price = extract_price_value(price);
        check_price_deviation(old_price, new_price, max_deviation_bps);
        new_price
    }

    // ===== HELPER FUNCTIONS =====

    fun pow10(exp: u64): u64 {
        let result = 1u64;
        let i = 0;
        while (i < exp) {
            result = result * 10;
            i = i + 1;
        };
        result
    }

    // ===== VIEW FUNCTIONS =====

    #[view]
    public fun get_precision(): u64 { PRECISION }

    #[view]
    public fun get_max_price_age(): u64 { MAX_PRICE_AGE_SECONDS }

    #[view]
    public fun get_max_deviation_bps(): u64 { MAX_DEVIATION_BPS }

    // ===== TESTS =====

    #[test]
    fun test_calculate_token_amount() {
        // $5000 at $10.50 should give ~476 tokens
        let usd_cents = 500000; // $5000
        let price = 1050000000; // $10.50 with 8 decimals
        let tokens = calculate_token_amount(usd_cents, price);
        
        // Should be approximately 476 tokens (47619047619 with 8 decimals)
        assert!(tokens > 47600000000 && tokens < 47700000000, 0);
    }

    #[test]
    fun test_calculate_usd_value() {
        // 500 tokens at $10.50 should give $5250
        let tokens = 50000000000; // 500 tokens with 8 decimals
        let price = 1050000000; // $10.50
        let usd_cents = calculate_usd_value(tokens, price);
        
        // Should be $5250 = 525000 cents
        assert!(usd_cents == 525000, 0);
    }

    #[test]
    fun test_rate_calculation() {
        // $5000/month should equal 1929012 per second with precision
        let monthly = 500000; // $5000 in cents
        let rate = calculate_rate_per_second(monthly);
        
        assert!(rate == 1929012, 0);
    }
}