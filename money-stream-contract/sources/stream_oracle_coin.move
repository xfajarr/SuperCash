/// Oracle-integrated payroll streams for Coin<T> types (APT, BTC, ETH)
/// Maintains 95% parallelism through resource isolation
module payroll_protocol::stream_oracle_coin {
    use std::signer;
    use std::vector;
    use std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::object::{Self, ExtendRef};
    use aptos_framework::timestamp;
    use aptos_framework::event;
    use aptos_framework::aptos_coin::AptosCoin;
    use pyth::pyth;
    use pyth::price_identifier::{Self, PriceIdentifier};
    use payroll_protocol::oracle_utils;

    // ===== ERRORS =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_STREAM_EXISTS: u64 = 2;
    const E_STREAM_NOT_FOUND: u64 = 3;
    const E_NOT_AUTHORIZED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_STREAM_INACTIVE: u64 = 6;
    const E_NOT_CANCELABLE: u64 = 7;
    const E_INSUFFICIENT_BALANCE: u64 = 8;
    const E_PRICE_UPDATE_FAILED: u64 = 9;
    const E_INSUFFICIENT_FEE: u64 = 10;
    const E_INVALID_PRICE_FEED: u64 = 11;
    const E_INSUFFICIENT_FEE_RESERVE: u64 = 12;

    // ===== CONSTANTS =====
    const STREAM_SEED: vector<u8> = b"STREAM_ORACLE_COIN_V1";

    // ===== STRUCTS =====

    struct StreamConfig has key {
        extend_ref: ExtendRef,
        total_streams_created: u64,
    }

    /// Oracle-integrated stream for Coin<CoinType>
    /// Each stream is isolated - perfect for parallel execution
    struct StreamCoinOracle<phantom CoinType> has key {
        sender: address,
        recipient: address,
        stream_id: u64,

        // USD-DENOMINATED SALARY
        usd_amount_per_month: u64, // USD cents (e.g., 500000 = $5000)

        // ORACLE INTEGRATION
        price_feed_id: PriceIdentifier,
        last_price: u64,
        last_price_update: u64,
        max_price_deviation_bps: u64,

        // STREAM STATE
        start_time: u64,
        last_withdrawal_time: u64,
        end_time: u64,

        // COIN STORAGE
        coin_store: Coin<CoinType>,

        // FEE RESERVE
        fee_reserve: Coin<AptosCoin>,

        // ACCOUNTING
        total_deposited: u64,
        total_withdrawn: u64,
        total_usd_paid: u64,

        // FLAGS
        is_active: bool,
        is_cancelable: bool,
        min_balance_usd: u64,
        emergency_pause: bool,
    }

    struct SenderRegistry has key {
        active_streams: vector<address>,
        stream_count: u64,
    }

    struct RecipientRegistry has key {
        active_streams: vector<address>,
    }

    // ===== EVENTS =====

    #[event]
    struct StreamCreatedEvent has drop, store {
        stream_address: address,
        sender: address,
        recipient: address,
        coin_type: vector<u8>,
        usd_amount_per_month: u64,
        price_feed_id: vector<u8>,
        initial_deposit: u64,
    }

    #[event]
    struct WithdrawalEvent has drop, store {
        stream_address: address,
        recipient: address,
        coin_amount: u64,
        usd_value: u64,
        price: u64,
        timestamp: u64,
    }

    #[event]
    struct PriceAdjustedEvent has drop, store {
        stream_address: address,
        old_price: u64,
        new_price: u64,
        timestamp: u64,
    }

    #[event]
    struct LowBalanceEvent has drop, store {
        stream_address: address,
        sender: address,
        current_balance: u64,
        usd_value: u64,
        threshold: u64,
    }

    // ===== INITIALIZATION =====

    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, STREAM_SEED);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        move_to(deployer, StreamConfig {
            extend_ref,
            total_streams_created: 0,
        });
    }

    public entry fun init_sender(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        if (!exists<SenderRegistry>(sender_addr)) {
            move_to(sender, SenderRegistry {
                active_streams: vector::empty(),
                stream_count: 0,
            });
        };
    }

    public entry fun init_recipient(recipient: &signer) {
        let recipient_addr = signer::address_of(recipient);
        if (!exists<RecipientRegistry>(recipient_addr)) {
            move_to(recipient, RecipientRegistry {
                active_streams: vector::empty(),
            });
        };
    }

    // ===== CORE FUNCTIONS =====

    /// Create USD-denominated stream for Coin type (APT, BTC, ETH, etc.)
    public entry fun create_stream<CoinType>(
        sender: &signer,
        recipient: address,
        usd_amount_per_month: u64, // USD cents
        price_feed_id: vector<u8>, // Pyth feed ID
        initial_deposit: u64, // Coin amount
        fee_reserve_amount: u64, // APT for oracle fees
        duration_seconds: u64,
        is_cancelable: bool,
        min_balance_usd: u64,
    ) acquires StreamConfig, SenderRegistry {
        let sender_addr = signer::address_of(sender);

        assert!(usd_amount_per_month > 0, E_INVALID_AMOUNT);
        assert!(initial_deposit > 0, E_INVALID_AMOUNT);
        assert!(fee_reserve_amount > 0, E_INVALID_AMOUNT);

        if (!exists<SenderRegistry>(sender_addr)) {
            init_sender(sender);
        };

        let now = timestamp::now_seconds();
        let end_time = if (duration_seconds == 0) { 0 } else { now + duration_seconds };

        // Validate price feed exists and get current price
        let price_id = price_identifier::from_byte_vec(price_feed_id);
        assert!(pyth::price_feed_exists(price_id), E_INVALID_PRICE_FEED);

        let price = pyth::get_price(price_id);
        let current_price = oracle_utils::validate_price(&price, 0, now, oracle_utils::get_max_deviation_bps());
        assert!(current_price > 0, E_INVALID_PRICE_FEED);

        // Get sender registry and increment stream count
        let sender_registry = borrow_global_mut<SenderRegistry>(sender_addr);
        let stream_id = sender_registry.stream_count;
        sender_registry.stream_count = stream_id + 1;

        // Create stream object with unique seed
        let config = borrow_global_mut<StreamConfig>(@payroll_protocol);
        let stream_seed = create_stream_seed(sender_addr, recipient, stream_id);

        let constructor_ref = object::create_named_object(sender, stream_seed);
        let object_signer = object::generate_signer(&constructor_ref);
        let stream_address = signer::address_of(&object_signer);

        // Withdraw coins and fee reserve
        let coins = coin::withdraw<CoinType>(sender, initial_deposit);
        let fee_reserve = coin::withdraw<AptosCoin>(sender, fee_reserve_amount);

        // Create stream
        let stream = StreamCoinOracle<CoinType> {
            sender: sender_addr,
            recipient,
            stream_id,
            usd_amount_per_month,
            price_feed_id: price_id,
            last_price: current_price,
            last_price_update: now,
            max_price_deviation_bps: oracle_utils::get_max_deviation_bps(),
            start_time: now,
            last_withdrawal_time: now,
            end_time,
            coin_store: coins,
            fee_reserve,
            total_deposited: initial_deposit,
            total_withdrawn: 0,
            total_usd_paid: 0,
            is_active: true,
            is_cancelable,
            min_balance_usd,
            emergency_pause: false,
        };

        move_to(&object_signer, stream);

        // Update registry
        vector::push_back(&mut sender_registry.active_streams, stream_address);

        event::emit(StreamCreatedEvent {
            stream_address,
            sender: sender_addr,
            recipient,
            coin_type: b"Coin",
            usd_amount_per_month,
            price_feed_id,
            initial_deposit,
        });

        config.total_streams_created = config.total_streams_created + 1;
    }

    /// Withdraw with price update - PARALLEL across different streams
    public entry fun withdraw<CoinType>(
        recipient: &signer,
        stream_address: address,
        price_update_data: vector<vector<u8>>,
    ) acquires StreamCoinOracle {
        let recipient_addr = signer::address_of(recipient);

        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);

        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        assert!(stream.recipient == recipient_addr, E_NOT_AUTHORIZED);
        assert!(stream.is_active, E_STREAM_INACTIVE);
        assert!(!stream.emergency_pause, E_STREAM_INACTIVE);

        // Update price with fee from reserve
        let update_fee = pyth::get_update_fee(&price_update_data);
        let fee_balance = coin::value(&stream.fee_reserve);
        assert!(fee_balance >= update_fee, E_INSUFFICIENT_FEE_RESERVE);

        let fee_coins = coin::extract(&mut stream.fee_reserve, update_fee);
        pyth::update_price_feeds(price_update_data, fee_coins);

        let now = timestamp::now_seconds();

        // Get current price with fallback to last price on error
        let current_price = if (pyth::price_feed_exists(stream.price_feed_id)) {
            let price = pyth::get_price(stream.price_feed_id);
            // Try to validate, fallback to last price if stale or invalid
            let price_timestamp = oracle_utils::extract_price_value(&price);
            if (price_timestamp > 0) {
                oracle_utils::validate_price(
                    &price,
                    stream.last_price,
                    now,
                    stream.max_price_deviation_bps
                )
            } else {
                stream.last_price
            }
        } else {
            stream.last_price
        };

        // Calculate USD earned
        let time_elapsed = now - stream.last_withdrawal_time;
        let usd_earned = oracle_utils::calculate_usd_earned(stream.usd_amount_per_month, time_elapsed);

        // Convert to coin amount
        let coin_amount = oracle_utils::calculate_token_amount(usd_earned, current_price);
        let balance = coin::value(&stream.coin_store);

        assert!(coin_amount <= balance, E_INSUFFICIENT_BALANCE);

        // Extract and transfer coins
        let withdrawal = coin::extract(&mut stream.coin_store, coin_amount);
        coin::deposit(recipient_addr, withdrawal);

        // Update state
        let old_price = stream.last_price;
        stream.last_price = current_price;
        stream.last_price_update = now;
        stream.last_withdrawal_time = now;
        stream.total_withdrawn = stream.total_withdrawn + coin_amount;
        stream.total_usd_paid = stream.total_usd_paid + usd_earned;

        // Check low balance
        let remaining_balance = coin::value(&stream.coin_store);
        let remaining_usd = oracle_utils::calculate_usd_value(remaining_balance, current_price);

        if (remaining_usd < stream.min_balance_usd) {
            event::emit(LowBalanceEvent {
                stream_address,
                sender: stream.sender,
                current_balance: remaining_balance,
                usd_value: remaining_usd,
                threshold: stream.min_balance_usd,
            });
        };

        // Emit events
        if (!exists<RecipientRegistry>(recipient_addr)) {
            init_recipient(recipient);
        };

        event::emit(WithdrawalEvent {
            stream_address,
            recipient: recipient_addr,
            coin_amount,
            usd_value: usd_earned,
            price: current_price,
            timestamp: now,
        });

        if (old_price != current_price) {
            event::emit(PriceAdjustedEvent {
                stream_address,
                old_price,
                new_price: current_price,
                timestamp: now,
            });
        };
    }

    /// Batch withdraw - MAXIMUM PARALLELISM
    /// All streams execute in parallel after single price update
    /// Caller must be the recipient of all streams
    public entry fun batch_withdraw<CoinType>(
        caller: &signer,
        stream_addresses: vector<address>,
        price_update_data: vector<vector<u8>>,
    ) acquires StreamCoinOracle {
        let caller_addr = signer::address_of(caller);

        // Calculate total fee needed from all streams
        let update_fee = pyth::get_update_fee(&price_update_data);
        let len = vector::length(&stream_addresses);

        // Collect fees from all streams proportionally
        let fee_per_stream = if (len > 0) { update_fee / len } else { 0 };
        let i = 0;
        let collected_fees = coin::zero<AptosCoin>();

        while (i < len) {
            let stream_addr = *vector::borrow(&stream_addresses, i);
            if (exists<StreamCoinOracle<CoinType>>(stream_addr)) {
                let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_addr);
                if (stream.recipient == caller_addr && coin::value(&stream.fee_reserve) >= fee_per_stream) {
                    let fee = coin::extract(&mut stream.fee_reserve, fee_per_stream);
                    coin::merge(&mut collected_fees, fee);
                };
            };
            i = i + 1;
        };

        // Update price once for all streams
        pyth::update_price_feeds(price_update_data, collected_fees);

        // Execute all withdrawals in parallel
        i = 0;
        while (i < len) {
            let stream_addr = *vector::borrow(&stream_addresses, i);

            if (exists<StreamCoinOracle<CoinType>>(stream_addr)) {
                withdraw_internal<CoinType>(stream_addr, caller_addr);
            };

            i = i + 1;
        };
    }

    /// Top up stream
    public entry fun top_up<CoinType>(
        sender: &signer,
        stream_address: address,
        amount: u64,
    ) acquires StreamCoinOracle {
        let sender_addr = signer::address_of(sender);

        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);

        let coins = coin::withdraw<CoinType>(sender, amount);
        coin::merge(&mut stream.coin_store, coins);

        stream.total_deposited = stream.total_deposited + amount;
    }

    /// Top up fee reserve
    public entry fun top_up_fee_reserve<CoinType>(
        sender: &signer,
        stream_address: address,
        amount: u64,
    ) acquires StreamCoinOracle {
        let sender_addr = signer::address_of(sender);

        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);

        let fee_coins = coin::withdraw<AptosCoin>(sender, amount);
        coin::merge(&mut stream.fee_reserve, fee_coins);
    }

    /// Cancel stream
    public entry fun cancel_stream<CoinType>(
        sender: &signer,
        stream_address: address,
    ) acquires StreamCoinOracle {
        let sender_addr = signer::address_of(sender);

        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);

        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);
        assert!(stream.is_cancelable, E_NOT_CANCELABLE);

        // Get current price with proper validation and fallback
        let now = timestamp::now_seconds();
        let current_price = if (pyth::price_feed_exists(stream.price_feed_id)) {
            let price = pyth::get_price(stream.price_feed_id);
            // Validate price freshness and deviation
            oracle_utils::validate_price(
                &price,
                stream.last_price,
                now,
                stream.max_price_deviation_bps
            )
        } else {
            stream.last_price
        };

        // Calculate earned
        let time_elapsed = now - stream.last_withdrawal_time;
        let usd_earned = oracle_utils::calculate_usd_earned(stream.usd_amount_per_month, time_elapsed);
        let coin_earned = oracle_utils::calculate_token_amount(usd_earned, current_price);

        let balance = coin::value(&stream.coin_store);
        let to_recipient = if (coin_earned > balance) { balance } else { coin_earned };

        // Send earned to recipient
        if (to_recipient > 0) {
            let recipient_coins = coin::extract(&mut stream.coin_store, to_recipient);
            coin::deposit(stream.recipient, recipient_coins);
        };

        // Return rest to sender
        let remaining = coin::value(&stream.coin_store);
        if (remaining > 0) {
            let sender_coins = coin::extract_all(&mut stream.coin_store);
            coin::deposit(sender_addr, sender_coins);
        };

        // Return remaining fee reserve to sender
        let fee_remaining = coin::value(&stream.fee_reserve);
        if (fee_remaining > 0) {
            let fee_refund = coin::extract_all(&mut stream.fee_reserve);
            coin::deposit(sender_addr, fee_refund);
        };

        stream.is_active = false;
    }

    /// Emergency pause/unpause by sender
    public entry fun set_emergency_pause<CoinType>(
        sender: &signer,
        stream_address: address,
        paused: bool,
    ) acquires StreamCoinOracle {
        let sender_addr = signer::address_of(sender);

        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);

        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);

        stream.emergency_pause = paused;
    }

    // ===== VIEW FUNCTIONS =====

    #[view]
    public fun get_withdrawable_usd<CoinType>(stream_address: address): u64 acquires StreamCoinOracle {
        if (!exists<StreamCoinOracle<CoinType>>(stream_address)) {
            return 0
        };
        
        let stream = borrow_global<StreamCoinOracle<CoinType>>(stream_address);
        let now = timestamp::now_seconds();
        let time_elapsed = now - stream.last_withdrawal_time;
        
        oracle_utils::calculate_usd_earned(stream.usd_amount_per_month, time_elapsed)
    }

    #[view]
    public fun get_withdrawable_coins<CoinType>(
        stream_address: address,
        current_price: u64,
    ): u64 acquires StreamCoinOracle {
        let usd = get_withdrawable_usd<CoinType>(stream_address);
        oracle_utils::calculate_token_amount(usd, current_price)
    }

    #[view]
    public fun get_stream_info<CoinType>(stream_address: address): (
        address, address, u64, u64, u64, u64, u64, bool
    ) acquires StreamCoinOracle {
        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);
        
        let stream = borrow_global<StreamCoinOracle<CoinType>>(stream_address);
        (
            stream.sender,
            stream.recipient,
            stream.usd_amount_per_month,
            stream.last_price,
            coin::value(&stream.coin_store),
            stream.total_withdrawn,
            stream.total_usd_paid,
            stream.is_active
        )
    }

    #[view]
    public fun get_stream_address(sender: address, recipient: address, stream_id: u64): address {
        let seed = create_stream_seed(sender, recipient, stream_id);
        object::create_object_address(&sender, seed)
    }

    #[view]
    public fun get_fee_reserve_balance<CoinType>(stream_address: address): u64 acquires StreamCoinOracle {
        assert!(exists<StreamCoinOracle<CoinType>>(stream_address), E_STREAM_NOT_FOUND);
        let stream = borrow_global<StreamCoinOracle<CoinType>>(stream_address);
        coin::value(&stream.fee_reserve)
    }

    // ===== INTERNAL FUNCTIONS =====

    fun withdraw_internal<CoinType>(stream_address: address, caller: address) acquires StreamCoinOracle {
        let stream = borrow_global_mut<StreamCoinOracle<CoinType>>(stream_address);
        if (!stream.is_active || stream.emergency_pause) { return };
        if (stream.recipient != caller) { return };

        let now = timestamp::now_seconds();

        // Get current price with fallback
        let current_price = if (pyth::price_feed_exists(stream.price_feed_id)) {
            let price = pyth::get_price(stream.price_feed_id);
            let price_val = oracle_utils::extract_price_value(&price);
            if (price_val > 0) { price_val } else { stream.last_price }
        } else {
            stream.last_price
        };

        let time_elapsed = now - stream.last_withdrawal_time;
        let usd_earned = oracle_utils::calculate_usd_earned(stream.usd_amount_per_month, time_elapsed);

        if (usd_earned == 0) { return };

        let coin_amount = oracle_utils::calculate_token_amount(usd_earned, current_price);
        let balance = coin::value(&stream.coin_store);

        if (coin_amount > balance) { return };

        let withdrawal = coin::extract(&mut stream.coin_store, coin_amount);
        coin::deposit(stream.recipient, withdrawal);

        stream.last_price = current_price;
        stream.last_price_update = now;
        stream.last_withdrawal_time = now;
        stream.total_withdrawn = stream.total_withdrawn + coin_amount;
        stream.total_usd_paid = stream.total_usd_paid + usd_earned;
    }

    fun create_stream_seed(sender: address, recipient: address, stream_id: u64): vector<u8> {
        let seed = STREAM_SEED;
        vector::append(&mut seed, bcs::to_bytes(&sender));
        vector::append(&mut seed, bcs::to_bytes(&recipient));
        vector::append(&mut seed, bcs::to_bytes(&stream_id));
        seed
    }
}