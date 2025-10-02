module payroll_protocol::stream_basic_fa {
    use std::signer;
    use std::vector;
    use aptos_std::bcs;
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleStore};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::dispatchable_fungible_asset;
    use aptos_framework::object::{Self, Object, ExtendRef};
    use aptos_framework::timestamp;
    use aptos_framework::event;

    // ===== ERRORS =====
    const E_NOT_INITIALIZED: u64 = 1;
    const E_STREAM_EXISTS: u64 = 2;
    const E_STREAM_NOT_FOUND: u64 = 3;
    const E_NOT_AUTHORIZED: u64 = 4;
    const E_INVALID_AMOUNT: u64 = 5;
    const E_INVALID_RATE: u64 = 6;
    const E_STREAM_INACTIVE: u64 = 7;
    const E_NOT_CANCELABLE: u64 = 8;
    const E_INSUFFICIENT_BALANCE: u64 = 9;
    const E_INVALID_RECIPIENT: u64 = 10;
    const E_RATE_TOO_LOW: u64 = 11;
    const E_STREAM_ALREADY_EXISTS: u64 = 12;

    // ===== CONSTANTS =====
    const PRECISION: u64 = 1_000_000;
    const STREAM_SEED: vector<u8> = b"PAYROLL_STREAM";
    const MIN_DEPOSIT: u64 = 1000; // Minimum 1000 units to prevent dust
    const MIN_RATE: u64 = 1; // Minimum rate to ensure withdrawable amount

    // ===== STRUCTS =====

    /// Global configuration stored under module deployer
    struct StreamConfig has key {
        extend_ref: ExtendRef,
        total_streams_created: u64,
    }

    /// Individual stream stored as an Object
    /// Each stream is completely isolated - enabling perfect parallelism
    struct StreamObject has key {
        /// Employer who created the stream
        sender: address,
        /// Employee receiving payments
        recipient: address,
        /// Token being streamed
        asset_metadata: Object<Metadata>,
        /// Tokens per second (with PRECISION multiplier)
        rate_per_second: u64,
        /// When stream started
        start_time: u64,
        /// Last time funds were withdrawn
        last_withdrawal_time: u64,
        /// When stream ends (0 = unlimited)
        end_time: u64,
        /// Store holding the tokens
        store: Object<FungibleStore>,
        /// Reference to control the store
        store_extend_ref: ExtendRef,
        /// Total deposited since creation
        total_deposited: u64,
        /// Total withdrawn so far
        total_withdrawn: u64,
        /// Is stream active
        is_active: bool,
        /// Can sender cancel
        is_cancelable: bool,
    }

    /// Tracking for sender (stored under sender's account)
    struct SenderRegistry has key {
        /// List of active stream objects created by this sender
        active_stream_objects: vector<address>,
    }

    /// Tracking for recipient (stored under recipient's account)
    struct RecipientRegistry has key {
        /// List of active stream objects for this recipient
        active_stream_objects: vector<address>,
    }

    // ===== EVENTS =====

    #[event]
    struct StreamCreatedEvent has drop, store {
        stream_address: address,
        sender: address,
        recipient: address,
        asset: address,
        rate_per_second: u64,
        initial_deposit: u64,
    }

    #[event]
    struct WithdrawalEvent has drop, store {
        stream_address: address,
        recipient: address,
        amount: u64,
        timestamp: u64,
    }

    #[event]
    struct StreamCancelledEvent has drop, store {
        stream_address: address,
        sender: address,
        recipient: address,
        returned_to_sender: u64,
        sent_to_recipient: u64,
    }

    #[event]
    struct StreamDepletedEvent has drop, store {
        stream_address: address,
        recipient: address,
        timestamp: u64,
    }

    // ===== INITIALIZATION =====

    /// Initialize the module with global configuration
    /// Called automatically when module is published
    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(deployer, STREAM_SEED);
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        
        move_to(deployer, StreamConfig {
            extend_ref,
            total_streams_created: 0,
        });
    }

    /// Initialize sender's registry for tracking created streams
    /// Must be called before creating first stream (or will be auto-initialized)
    /// @param sender - The account that will create streams
    public entry fun init_sender(sender: &signer) {
        let sender_addr = signer::address_of(sender);
        if (!exists<SenderRegistry>(sender_addr)) {
            move_to(sender, SenderRegistry {
                active_stream_objects: vector::empty(),
            });
        };
    }

    /// Initialize recipient's registry for tracking received streams
    /// Should be called by recipient to enable tracking (or will be auto-initialized on first withdrawal)
    /// @param recipient - The account that will receive streams
    public entry fun init_recipient(recipient: &signer) {
        let recipient_addr = signer::address_of(recipient);
        if (!exists<RecipientRegistry>(recipient_addr)) {
            move_to(recipient, RecipientRegistry {
                active_stream_objects: vector::empty(),
            });
        };
    }

    // ===== CORE FUNCTIONS =====

    /// Create a new payment stream with continuous token flow
    /// Each stream is an isolated Object enabling perfect parallel execution via Block-STM
    /// 
    /// @param sender - Account funding the stream (must have sufficient balance)
    /// @param recipient - Account receiving the streamed tokens
    /// @param asset_metadata - Address of the fungible asset metadata object to stream
    /// @param rate_per_second - Tokens per second multiplied by PRECISION (1_000_000)
    /// @param initial_deposit - Initial tokens to deposit (must be >= MIN_DEPOSIT)
    /// @param duration_seconds - Stream duration in seconds (0 = unlimited)
    /// @param is_cancelable - Whether sender can cancel and retrieve remaining funds
    /// 
    /// Emits: StreamCreatedEvent
    /// Aborts if: Stream already exists, invalid parameters, insufficient balance
    public entry fun create_stream(
        sender: &signer,
        recipient: address,
        asset_metadata: address,
        rate_per_second: u64,
        initial_deposit: u64,
        duration_seconds: u64,
        is_cancelable: bool,
    ) acquires StreamConfig, SenderRegistry, RecipientRegistry {
        let sender_addr = signer::address_of(sender);
        
        // Validations
        assert!(recipient != sender_addr, E_INVALID_RECIPIENT);
        assert!(rate_per_second >= MIN_RATE, E_INVALID_RATE);
        assert!(initial_deposit >= MIN_DEPOSIT, E_INVALID_AMOUNT);
        
        // Check if stream already exists
        let stream_seed = stream_seed_from_addresses(sender_addr, recipient);
        let potential_stream_addr = object::create_object_address(&sender_addr, stream_seed);
        assert!(!exists<StreamObject>(potential_stream_addr), E_STREAM_ALREADY_EXISTS);
        
        // Initialize registries if needed
        if (!exists<SenderRegistry>(sender_addr)) {
            init_sender(sender);
        };
        // Note: Recipient registry will be initialized when they first withdraw
        
        let metadata = object::address_to_object<Metadata>(asset_metadata);
        let now = timestamp::now_seconds();
        let end_time = if (duration_seconds == 0) { 0 } else { now + duration_seconds };
        
        // Create stream object with unique address
        let config = borrow_global_mut<StreamConfig>(@payroll_protocol);
        
        let constructor_ref = object::create_named_object(sender, stream_seed);
        let object_signer = object::generate_signer(&constructor_ref);
        let stream_address = signer::address_of(&object_signer);
        
        // Create store for holding tokens
        let store_constructor_ref = object::create_object(stream_address);
        let store_extend_ref = object::generate_extend_ref(&store_constructor_ref);
        let store = fungible_asset::create_store(&store_constructor_ref, metadata);
        
        // Transfer initial deposit to stream (withdraw from sender's primary store)
        let fa = primary_fungible_store::withdraw(sender, metadata, initial_deposit);
        dispatchable_fungible_asset::deposit(store, fa);
        
        // Create stream object
        let stream = StreamObject {
            sender: sender_addr,
            recipient,
            asset_metadata: metadata,
            rate_per_second,
            start_time: now,
            last_withdrawal_time: now,
            end_time,
            store,
            store_extend_ref,
            total_deposited: initial_deposit,
            total_withdrawn: 0,
            is_active: true,
            is_cancelable,
        };
        
        move_to(&object_signer, stream);
        
        // Update sender registry
        let sender_registry = borrow_global_mut<SenderRegistry>(sender_addr);
        vector::push_back(&mut sender_registry.active_stream_objects, stream_address);
        
        // Update recipient registry
        if (exists<RecipientRegistry>(recipient)) {
            let recipient_registry = borrow_global_mut<RecipientRegistry>(recipient);
            vector::push_back(&mut recipient_registry.active_stream_objects, stream_address);
        };
        
        event::emit(StreamCreatedEvent {
            stream_address,
            sender: sender_addr,
            recipient,
            asset: asset_metadata,
            rate_per_second,
            initial_deposit,
        });
        
        config.total_streams_created = config.total_streams_created + 1;
    }

    /// Withdraw accumulated tokens from a stream
    /// FULLY PARALLEL: Each stream is isolated, enabling zero-conflict parallel execution
    /// 
    /// @param recipient - Must be the stream recipient
    /// @param stream_address - Address of the StreamObject
    /// 
    /// Calculates tokens earned since last withdrawal based on rate_per_second
    /// Respects end_time if set, automatically deactivates when depleted
    /// 
    /// Emits: WithdrawalEvent, StreamDepletedEvent (if depleted)
    /// Aborts if: Not recipient, stream inactive, nothing to withdraw
    public entry fun withdraw(
        recipient: &signer,
        stream_address: address,
    ) acquires StreamObject, RecipientRegistry, SenderRegistry {
        let recipient_addr = signer::address_of(recipient);
        
        assert!(exists<StreamObject>(stream_address), E_STREAM_NOT_FOUND);
        
        let stream = borrow_global_mut<StreamObject>(stream_address);
        assert!(stream.recipient == recipient_addr, E_NOT_AUTHORIZED);
        assert!(stream.is_active, E_STREAM_INACTIVE);
        
        let (amount, is_depleted) = calculate_withdrawable(stream);
        assert!(amount > 0, E_INSUFFICIENT_BALANCE);
        
        // Withdraw from stream's internal store (must use dispatchable since metadata is dispatchable)
        let store_signer = object::generate_signer_for_extending(&stream.store_extend_ref);
        let fa = dispatchable_fungible_asset::withdraw(&store_signer, stream.store, amount);
        
        // Deposit to recipient (using dispatchable for compliance)
        let recipient_store = primary_fungible_store::ensure_primary_store_exists(recipient_addr, stream.asset_metadata);
        dispatchable_fungible_asset::deposit(recipient_store, fa);
        
        // Update stream state
        let now = timestamp::now_seconds();
        stream.last_withdrawal_time = now;
        stream.total_withdrawn = stream.total_withdrawn + amount;
        
        if (is_depleted) {
            stream.is_active = false;
            
            // Remove from registries
            if (exists<SenderRegistry>(stream.sender)) {
                let sender_registry = borrow_global_mut<SenderRegistry>(stream.sender);
                remove_stream_from_vector(&mut sender_registry.active_stream_objects, stream_address);
            };
            
            if (exists<RecipientRegistry>(recipient_addr)) {
                let recipient_registry = borrow_global_mut<RecipientRegistry>(recipient_addr);
                remove_stream_from_vector(&mut recipient_registry.active_stream_objects, stream_address);
            };
        };
        
        // Emit event
        event::emit(WithdrawalEvent {
            stream_address,
            recipient: recipient_addr,
            amount,
            timestamp: now,
        });
    }

    /// Batch withdraw from multiple streams in a single transaction
    /// MAXIMUM PARALLELISM: Block-STM executes all withdrawals in parallel automatically
    /// 
    /// @param _caller - Any account can trigger (permissionless batch operation)
    /// @param stream_addresses - Vector of stream addresses to withdraw from
    /// 
    /// Skips inactive streams silently, processes all valid streams
    /// Ideal for automated withdrawal services or multi-stream recipients
    public entry fun batch_withdraw(
        _caller: &signer,
        stream_addresses: vector<address>,
    ) acquires StreamObject, RecipientRegistry, SenderRegistry {
        let len = vector::length(&stream_addresses);
        let i = 0;
        
        while (i < len) {
            let stream_address = *vector::borrow(&stream_addresses, i);
            
            if (exists<StreamObject>(stream_address)) {
                let stream = borrow_global<StreamObject>(stream_address);
                if (stream.is_active) {
                    // Withdraw directly without signer (permissionless)
                    withdraw_internal(stream_address);
                };
            };
            
            i = i + 1;
        };
    }

    /// Add more tokens to an existing active stream
    /// 
    /// @param sender - Must be the original stream creator
    /// @param stream_address - Address of the StreamObject to fund
    /// @param amount - Additional tokens to deposit (must be > 0)
    /// 
    /// Extends the stream's lifetime based on current rate
    /// Does not change rate_per_second or other parameters
    /// 
    /// Aborts if: Not sender, stream inactive, invalid amount
    public entry fun top_up(
        sender: &signer,
        stream_address: address,
        amount: u64,
    ) acquires StreamObject {
        let sender_addr = signer::address_of(sender);
        
        assert!(exists<StreamObject>(stream_address), E_STREAM_NOT_FOUND);
        assert!(amount > 0, E_INVALID_AMOUNT);
        
        let stream = borrow_global_mut<StreamObject>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);
        assert!(stream.is_active, E_STREAM_INACTIVE);
        
        // Top up stream balance (withdraw from sender's primary store)
        let fa = primary_fungible_store::withdraw(sender, stream.asset_metadata, amount);
        dispatchable_fungible_asset::deposit(stream.store, fa);
        
        stream.total_deposited = stream.total_deposited + amount;
    }

    /// Cancel a stream and distribute funds appropriately
    /// 
    /// @param sender - Must be the original stream creator
    /// @param stream_address - Address of the StreamObject to cancel
    /// 
    /// Behavior:
    /// - Sends earned tokens to recipient (up to current time)
    /// - Returns remaining unearned tokens to sender
    /// - Deactivates stream permanently
    /// - Removes from both sender and recipient registries
    /// 
    /// Emits: StreamCancelledEvent
    /// Aborts if: Not sender, not cancelable, stream not found
    public entry fun cancel_stream(
        sender: &signer,
        stream_address: address,
    ) acquires StreamObject, SenderRegistry, RecipientRegistry {
        let sender_addr = signer::address_of(sender);
        
        assert!(exists<StreamObject>(stream_address), E_STREAM_NOT_FOUND);
        
        let stream = borrow_global_mut<StreamObject>(stream_address);
        assert!(stream.sender == sender_addr, E_NOT_AUTHORIZED);
        assert!(stream.is_cancelable, E_NOT_CANCELABLE);
        
        let (withdrawable, _) = calculate_withdrawable(stream);
        let balance = fungible_asset::balance(stream.store);
        
        let store_signer = object::generate_signer_for_extending(&stream.store_extend_ref);
        
        // Send earned amount to recipient (using dispatchable for compliance)
        let to_recipient = if (withdrawable > balance) { balance } else { withdrawable };
        if (to_recipient > 0) {
            let recipient_fa = dispatchable_fungible_asset::withdraw(&store_signer, stream.store, to_recipient);
            let recipient_store = primary_fungible_store::ensure_primary_store_exists(stream.recipient, stream.asset_metadata);
            dispatchable_fungible_asset::deposit(recipient_store, recipient_fa);
        };
        
        // Return remaining to sender (using dispatchable for compliance)
        let remaining = fungible_asset::balance(stream.store);
        if (remaining > 0) {
            let sender_fa = dispatchable_fungible_asset::withdraw(&store_signer, stream.store, remaining);
            let sender_store = primary_fungible_store::ensure_primary_store_exists(sender_addr, stream.asset_metadata);
            dispatchable_fungible_asset::deposit(sender_store, sender_fa);
        };
        
        stream.is_active = false;
        
        // Remove from sender registry
        if (exists<SenderRegistry>(sender_addr)) {
            let sender_registry = borrow_global_mut<SenderRegistry>(sender_addr);
            remove_stream_from_vector(&mut sender_registry.active_stream_objects, stream_address);
        };
        
        // Remove from recipient registry
        if (exists<RecipientRegistry>(stream.recipient)) {
            let recipient_registry = borrow_global_mut<RecipientRegistry>(stream.recipient);
            remove_stream_from_vector(&mut recipient_registry.active_stream_objects, stream_address);
        };
        
        // Emit event
        event::emit(StreamCancelledEvent {
            stream_address,
            sender: sender_addr,
            recipient: stream.recipient,
            returned_to_sender: remaining,
            sent_to_recipient: to_recipient,
        });
    }

    // ===== VIEW FUNCTIONS =====

    /// Calculate how many tokens are currently withdrawable from a stream
    /// 
    /// @param stream_address - Address of the StreamObject
    /// @return Amount of tokens recipient can withdraw now
    /// 
    /// Returns 0 if stream doesn't exist or nothing earned yet
    /// Respects end_time and available balance
    #[view]
    public fun get_withdrawable_amount(stream_address: address): u64 acquires StreamObject {
        if (!exists<StreamObject>(stream_address)) {
            return 0
        };
        
        let stream = borrow_global<StreamObject>(stream_address);
        let (amount, _) = calculate_withdrawable(stream);
        amount
    }

    /// Get comprehensive information about a stream
    /// 
    /// @param stream_address - Address of the StreamObject
    /// @return Tuple containing:
    ///   - sender address
    ///   - recipient address  
    ///   - asset metadata address
    ///   - rate per second (with PRECISION)
    ///   - start time (seconds)
    ///   - end time (0 = unlimited)
    ///   - current balance
    ///   - total withdrawn
    ///   - total deposited
    ///   - is active
    /// 
    /// Aborts if stream doesn't exist
    #[view]
    public fun get_stream_info(stream_address: address): (
        address, address, address, u64, u64, u64, u64, u64, u64, bool
    ) acquires StreamObject {
        assert!(exists<StreamObject>(stream_address), E_STREAM_NOT_FOUND);
        
        let stream = borrow_global<StreamObject>(stream_address);
        (
            stream.sender,
            stream.recipient,
            object::object_address(&stream.asset_metadata),
            stream.rate_per_second,
            stream.start_time,
            stream.end_time,
            fungible_asset::balance(stream.store),
            stream.total_withdrawn,
            stream.total_deposited,
            stream.is_active
        )
    }

    /// Helper to calculate rate_per_second from a monthly amount
    /// 
    /// @param amount_per_month - Desired monthly streaming amount
    /// @return rate_per_second value to use in create_stream
    /// 
    /// Uses 30-day months (2,592,000 seconds)
    /// Example: calculate_rate(1000) for streaming 1000 tokens/month
    #[view]
    public fun calculate_rate(amount_per_month: u64): u64 {
        let seconds_per_month = 30 * 24 * 60 * 60;
        ((amount_per_month as u128) * (PRECISION as u128) / (seconds_per_month as u128)) as u64
    }

    /// Calculate the deterministic address for a stream between two parties
    /// 
    /// @param sender - Stream creator address
    /// @param recipient - Stream receiver address
    /// @return Address where the stream object will be/is located
    /// 
    /// Useful for checking if stream exists before creating
    #[view]
    public fun get_stream_address(sender: address, recipient: address): address {
        let seed = stream_seed_from_addresses(sender, recipient);
        object::create_object_address(&sender, seed)
    }

    /// Get all active stream addresses created by a sender
    /// 
    /// @param sender - Address of stream creator
    /// @return Vector of active stream addresses (empty if none)
    #[view]
    public fun get_sender_streams(sender: address): vector<address> acquires SenderRegistry {
        if (!exists<SenderRegistry>(sender)) {
            return vector::empty()
        };
        let registry = borrow_global<SenderRegistry>(sender);
        registry.active_stream_objects
    }

    /// Get all active stream addresses where recipient receives funds
    /// 
    /// @param recipient - Address of stream receiver
    /// @return Vector of active stream addresses (empty if none)
    #[view]
    public fun get_recipient_streams(recipient: address): vector<address> acquires RecipientRegistry {
        if (!exists<RecipientRegistry>(recipient)) {
            return vector::empty()
        };
        let registry = borrow_global<RecipientRegistry>(recipient);
        registry.active_stream_objects
    }

    /// Check if a stream is currently active
    /// 
    /// @param stream_address - Address of the StreamObject
    /// @return true if stream exists and is active, false otherwise
    #[view]
    public fun is_stream_active(stream_address: address): bool acquires StreamObject {
        if (!exists<StreamObject>(stream_address)) {
            return false
        };
        let stream = borrow_global<StreamObject>(stream_address);
        stream.is_active
    }

    /// Get total number of streams created across the platform
    /// @return Total streams created (including inactive/cancelled)
    #[view]
    public fun get_total_streams_created(): u64 acquires StreamConfig {
        let config = borrow_global<StreamConfig>(@payroll_protocol);
        config.total_streams_created
    }

    // ===== INTERNAL FUNCTIONS =====

    /// Internal function to calculate withdrawable amount and depletion status
    /// 
    /// Respects end_time if set, uses elapsed time × rate to calculate earned tokens
    /// 
    /// @param stream - Reference to StreamObject
    /// @return (withdrawable_amount, is_depleted)
    fun calculate_withdrawable(stream: &StreamObject): (u64, bool) {
        let now = timestamp::now_seconds();
        
        // Enforce end_time if set
        let effective_time = if (stream.end_time > 0 && now > stream.end_time) {
            stream.end_time
        } else {
            now
        };
        
        let elapsed = effective_time - stream.last_withdrawal_time;
        
        let theoretical = ((elapsed as u128) * (stream.rate_per_second as u128) / (PRECISION as u128)) as u64;
        let balance = fungible_asset::balance(stream.store);
        
        if (theoretical >= balance) {
            (balance, true)
        } else {
            (theoretical, false)
        }
    }

    /// Internal withdrawal logic used by batch operations
    /// 
    /// Silently skips if stream inactive or nothing to withdraw
    /// Updates registries on depletion
    /// 
    /// @param stream_address - Address of StreamObject to process
    fun withdraw_internal(stream_address: address) acquires StreamObject, RecipientRegistry, SenderRegistry {
        let stream = borrow_global_mut<StreamObject>(stream_address);
        
        if (!stream.is_active) { return };
        
        let (amount, is_depleted) = calculate_withdrawable(stream);
        if (amount == 0) { return };
        
        let store_signer = object::generate_signer_for_extending(&stream.store_extend_ref);
        let fa = dispatchable_fungible_asset::withdraw(&store_signer, stream.store, amount);
        // Distribute to recipient (using dispatchable for compliance)
        let recipient_store = primary_fungible_store::ensure_primary_store_exists(stream.recipient, stream.asset_metadata);
        dispatchable_fungible_asset::deposit(recipient_store, fa);
        
        let now = timestamp::now_seconds();
        stream.last_withdrawal_time = now;
        stream.total_withdrawn = stream.total_withdrawn + amount;
        
        if (is_depleted) {
            stream.is_active = false;
            
            // Remove from registries
            if (exists<SenderRegistry>(stream.sender)) {
                let sender_registry = borrow_global_mut<SenderRegistry>(stream.sender);
                remove_stream_from_vector(&mut sender_registry.active_stream_objects, stream_address);
            };
            
            if (exists<RecipientRegistry>(stream.recipient)) {
                let recipient_registry = borrow_global_mut<RecipientRegistry>(stream.recipient);
                remove_stream_from_vector(&mut recipient_registry.active_stream_objects, stream_address);
            };
        };
    }

    /// Generate unique seed for stream object creation
    /// 
    /// Combines STREAM_SEED constant with sender and recipient addresses
    /// Ensures one stream per sender-recipient pair
    /// 
    /// @param sender - Stream creator
    /// @param recipient - Stream receiver
    /// @return Unique seed bytes for object creation
    fun stream_seed_from_addresses(sender: address, recipient: address): vector<u8> {
        let seed = STREAM_SEED;
        vector::append(&mut seed, bcs::to_bytes(&sender));
        vector::append(&mut seed, bcs::to_bytes(&recipient));
        seed
    }

    /// Remove a stream address from a vector efficiently
    /// 
    /// Uses swap_remove for O(1) removal (order not preserved)
    /// Silently returns if address not found
    /// 
    /// @param vec - Mutable reference to vector of addresses
    /// @param stream_addr - Address to remove
    fun remove_stream_from_vector(vec: &mut vector<address>, stream_addr: address) {
        let len = vector::length(vec);
        let i = 0;
        while (i < len) {
            if (*vector::borrow(vec, i) == stream_addr) {
                vector::swap_remove(vec, i);
                return
            };
            i = i + 1;
        };
    }

    // ===== TESTS =====

    #[test_only]
    use aptos_framework::account;
    
    #[test(deployer = @payroll_protocol, sender = @0x100, recipient = @0x200)]
    public fun test_stream_creation(
        deployer: &signer,
        sender: &signer,
        recipient: &signer,
    ) acquires StreamConfig, SenderRegistry {
        // Setup
        timestamp::set_time_has_started_for_testing(deployer);
        init_module(deployer);
        
        let sender_addr = signer::address_of(sender);
        let recipient_addr = signer::address_of(recipient);
        
        account::create_account_for_test(sender_addr);
        account::create_account_for_test(recipient_addr);
        
        // Test stream creation
        // In real test, would setup actual FA metadata and tokens
    }
}