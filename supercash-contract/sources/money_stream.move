module supercash::money_stream {
    use std::signer;
    use std::string::{String};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self};
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info;
    use aptos_std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_STREAM_NOT_FOUND: u64 = 3;
    const E_STREAM_NOT_ACTIVE: u64 = 4;
    const E_STREAM_ALREADY_ACTIVE: u64 = 5;
    const E_INVALID_DURATION: u64 = 7;
    const E_INVALID_AMOUNT: u64 = 8;
    const E_UNAUTHORIZED: u64 = 9;
    const E_ZERO_BALANCE_TO_WITHDRAW: u64 = 10;
    const E_INVALID_START_TIME: u64 = 11;
    const E_INVALID_CLIFF: u64 = 12;
    const E_INVALID_INTERVAL: u64 = 13;

    // --- Time Interval Constants ---
    const UNIT_HOUR: u8 = 1;
    const UNIT_DAY: u8 = 2;
    const UNIT_WEEK: u8 = 3;
    const UNIT_MONTH: u8 = 4; // 30-day

    const SECONDS_IN_HOUR: u64 = 3600;
    const SECONDS_IN_DAY: u64 = 86400;
    const SECONDS_IN_WEEK: u64 = 604800;
    const SECONDS_IN_MONTH: u64 = 2592000;

    // --- Events ---
    struct StreamCreated has drop, store { stream_id: u64, sender: address, recipient: address, total_amount: u64, start_time: u64, end_time: u64, cliff_timestamp: u64, asset_type: String }
    struct StreamWithdrawn has drop, store { stream_id: u64, recipient: address, withdrawn_amount: u64 }
    struct StreamPaused has drop, store { stream_id: u64, timestamp: u64 }
    struct StreamResumed has drop, store { stream_id: u64, new_end_time: u64 }
    struct StreamCanceled has drop, store { stream_id: u64, sender: address, recipient: address, sender_return_amount: u64, recipient_final_amount: u64 }

    // --- Data Structures ---
    struct Stream<AssetDetails: store> has store {
        sender: address,
        recipient: address,
        total_amount: u64,
        start_time: u64,
        end_time: u64,
        cliff_timestamp: u64,
        flow_rate_per_second: u128,
        withdrawn_amount: u64,
        is_active: bool,
        last_pause_time: u64,
        asset_details: AssetDetails,
    }

    struct CoinDetails<phantom CoinType> has store { escrowed_asset: Coin<CoinType> }
    struct FaDetails has store { metadata_addr: address, resource_signer_cap: account::SignerCapability }

    struct StreamHub<AssetDetails: store> has key {
        streams: Table<u64, Stream<AssetDetails>>,
        next_stream_id: u64,
        stream_created_events: EventHandle<StreamCreated>,
        stream_withdrawn_events: EventHandle<StreamWithdrawn>,
        stream_paused_events: EventHandle<StreamPaused>,
        stream_resumed_events: EventHandle<StreamResumed>,
        stream_canceled_events: EventHandle<StreamCanceled>,
    }

    // Add this struct in your "Data Structures" section
    struct StreamDetails has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        total_amount: u64,
        withdrawn_amount: u64,
        start_time: u64,
        end_time: u64,
        cliff_timestamp: u64,
        is_active: bool,
        flow_rate_per_second: u128,
    }

    // --- Internal Core Logic ---
    fun internal_calculate_claimable<AssetDetails: store>(stream: &Stream<AssetDetails>): u64 {
        let now = timestamp::now_seconds();
        if (now < stream.cliff_timestamp) { return 0 };
        if (now >= stream.end_time) { return stream.total_amount - stream.withdrawn_amount };

        let effective_time = if (stream.is_active) now else stream.last_pause_time;
        if (effective_time <= stream.start_time) { return 0 };

        let duration_streamed = (effective_time - stream.start_time) as u128;
        let total_earned = duration_streamed * stream.flow_rate_per_second;

        let capped_earned = if (total_earned > (stream.total_amount as u128)) {
            (stream.total_amount as u128)
        } else {
            total_earned
        };
        (capped_earned as u64) - stream.withdrawn_amount
    }

    // --- Coin Functions ---
    public entry fun initialize_hub_coin<CoinType>(account: &signer) {
        assert!(!exists<StreamHub<CoinDetails<CoinType>>>(signer::address_of(account)), E_ALREADY_INITIALIZED);
        move_to(account, StreamHub<CoinDetails<CoinType>> {
            streams: table::new(),
            next_stream_id: 0,
            stream_created_events: account::new_event_handle<StreamCreated>(account),
            stream_withdrawn_events: account::new_event_handle<StreamWithdrawn>(account),
            stream_paused_events: account::new_event_handle<StreamPaused>(account),
            stream_resumed_events: account::new_event_handle<StreamResumed>(account),
            stream_canceled_events: account::new_event_handle<StreamCanceled>(account),
        });
    }

    public entry fun create_stream_coin<CoinType>(sender: &signer, recipient: address, total_amount: u64, start_time: u64, end_time: u64, cliff_duration_seconds: u64) acquires StreamHub {
        let now = timestamp::now_seconds();
        assert!(start_time >= now, E_INVALID_START_TIME);
        assert!(end_time > start_time, E_INVALID_DURATION);
        assert!(total_amount > 0, E_INVALID_AMOUNT);
        let duration = end_time - start_time;
        assert!(duration > 0, E_INVALID_DURATION);
        let cliff_timestamp = start_time + cliff_duration_seconds;
        assert!(cliff_timestamp <= end_time, E_INVALID_CLIFF);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<CoinDetails<CoinType>>>(sender_addr)) {
            initialize_hub_coin<CoinType>(sender);
        };
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id += 1;

        let new_stream = Stream<CoinDetails<CoinType>> {
            sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp,
            flow_rate_per_second: (total_amount as u128) / (duration as u128),
            withdrawn_amount: 0, is_active: true, last_pause_time: 0,
            asset_details: CoinDetails<CoinType> { escrowed_asset: coin::withdraw<CoinType>(sender, total_amount) },
        };
        table::add(&mut stream_hub.streams, stream_id, new_stream);
        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated { stream_id, sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp, asset_type: type_info::type_name<CoinType>() });
    }

    /// Create a stream by defining a rate (e.g., 100 tokens per month).
    public entry fun create_stream_by_rate_coin<CoinType>(
        sender: &signer,
        recipient: address,
        amount_per_interval: u64,
        interval_unit: u8,
        duration_seconds: u64,
        cliff_duration_seconds: u64
    ) acquires StreamHub {
        let now = timestamp::now_seconds();
        let start_time = now;
        let end_time = now + duration_seconds;
        
        assert!(duration_seconds > 0, E_INVALID_DURATION);
        assert!(amount_per_interval > 0, E_INVALID_AMOUNT);
        let cliff_timestamp = start_time + cliff_duration_seconds;
        assert!(cliff_timestamp <= end_time, E_INVALID_CLIFF);

        // Calculate the number of seconds for the user's chosen interval
        let seconds_per_interval = if (interval_unit == UNIT_HOUR) {
            SECONDS_IN_HOUR
        } else if (interval_unit == UNIT_DAY) {
            SECONDS_IN_DAY
        } else if (interval_unit == UNIT_WEEK) {
            SECONDS_IN_WEEK
        } else if (interval_unit == UNIT_MONTH) {
            SECONDS_IN_MONTH
        } else {
            abort E_INVALID_INTERVAL
        };

        // Calculate the precise flow rate and total amount to be streamed
        // Formula: total_amount = (amount_per_interval * total_duration) / interval_duration
        let total_amount = ((amount_per_interval as u128) * (duration_seconds as u128) / (seconds_per_interval as u128)) as u64;
        let flow_rate_per_second = (amount_per_interval as u128) / (seconds_per_interval as u128);
        assert!(total_amount > 0, E_INVALID_AMOUNT);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<CoinDetails<CoinType>>>(sender_addr)) {
            initialize_hub_coin<CoinType>(sender);
        };
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id += 1;

        let new_stream = Stream<CoinDetails<CoinType>> {
            sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp,
            flow_rate_per_second, withdrawn_amount: 0, is_active: true, last_pause_time: 0,
            asset_details: CoinDetails<CoinType> { escrowed_asset: coin::withdraw<CoinType>(sender, total_amount) },
        };
        table::add(&mut stream_hub.streams, stream_id, new_stream);
        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated { stream_id, sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp, asset_type: type_info::type_name<CoinType>() });
    }

    public entry fun withdraw_from_stream_coin<CoinType>(recipient: &signer, sender_addr: address, stream_id: u64) acquires StreamHub {
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.recipient == signer::address_of(recipient), E_UNAUTHORIZED);

        let claimable = internal_calculate_claimable(stream);
        assert!(claimable > 0, E_ZERO_BALANCE_TO_WITHDRAW);

        stream.withdrawn_amount += claimable;
        coin::deposit(stream.recipient, coin::extract(&mut stream.asset_details.escrowed_asset, claimable));
        event::emit_event(&mut stream_hub.stream_withdrawn_events, StreamWithdrawn { stream_id, recipient: stream.recipient, withdrawn_amount: claimable });
    }

    public entry fun pause_stream_coin<CoinType>(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(stream.is_active, E_STREAM_NOT_ACTIVE);
        stream.is_active = false;
        stream.last_pause_time = timestamp::now_seconds();
        event::emit_event(&mut stream_hub.stream_paused_events, StreamPaused { stream_id, timestamp: stream.last_pause_time });
    }

    public entry fun resume_stream_coin<CoinType>(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(!stream.is_active, E_STREAM_ALREADY_ACTIVE);
        let pause_duration = timestamp::now_seconds() - stream.last_pause_time;
        stream.end_time += pause_duration;
        stream.is_active = true;
        stream.last_pause_time = 0;
        event::emit_event(&mut stream_hub.stream_resumed_events, StreamResumed { stream_id, new_end_time: stream.end_time });
    }

    public entry fun cancel_stream_coin<CoinType>(canceler: &signer, sender_addr: address, stream_id: u64) acquires StreamHub {
        let canceler_addr = signer::address_of(canceler);
        let stream_hub = borrow_global_mut<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::remove(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == canceler_addr || stream.recipient == canceler_addr, E_UNAUTHORIZED);
        
        let recipient_final_amount = internal_calculate_claimable(&stream);
        
        let Stream {
            sender,
            recipient,
            asset_details: CoinDetails { escrowed_asset },
            ..
        } = stream;

        if (recipient_final_amount > 0) {
            coin::deposit(recipient, coin::extract(&mut escrowed_asset, recipient_final_amount));
        };

        let remaining_coin = coin::extract_all(&mut escrowed_asset);
        let sender_return_amount = coin::value(&remaining_coin);
        coin::deposit(sender, remaining_coin);
        coin::destroy_zero(escrowed_asset);

        event::emit_event(&mut stream_hub.stream_canceled_events, StreamCanceled { stream_id, sender, recipient, sender_return_amount, recipient_final_amount });
    }

    // --- Fungible Asset Functions ---
    public entry fun initialize_hub_fa(account: &signer) {
        assert!(!exists<StreamHub<FaDetails>>(signer::address_of(account)), E_ALREADY_INITIALIZED);
        move_to(account, StreamHub<FaDetails> {
            streams: table::new(),
            next_stream_id: 0,
            stream_created_events: account::new_event_handle<StreamCreated>(account),
            stream_withdrawn_events: account::new_event_handle<StreamWithdrawn>(account),
            stream_paused_events: account::new_event_handle<StreamPaused>(account),
            stream_resumed_events: account::new_event_handle<StreamResumed>(account),
            stream_canceled_events: account::new_event_handle<StreamCanceled>(account),
        });
    }

    public entry fun create_stream_fa(sender: &signer, recipient: address, metadata_addr: address, total_amount: u64, start_time: u64, end_time: u64, cliff_duration_seconds: u64) acquires StreamHub {
        let now = timestamp::now_seconds();
        assert!(start_time >= now, E_INVALID_START_TIME);
        assert!(end_time > start_time, E_INVALID_DURATION);
        assert!(total_amount > 0, E_INVALID_AMOUNT);
        let duration = end_time - start_time;
        assert!(duration > 0, E_INVALID_DURATION);
        let cliff_timestamp = start_time + cliff_duration_seconds;
        assert!(cliff_timestamp <= end_time, E_INVALID_CLIFF);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<FaDetails>>(sender_addr)) {
            initialize_hub_fa(sender);
        };
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id += 1;

        let (resource_signer, resource_signer_cap) = account::create_resource_account(sender, bcs::to_bytes(&stream_id));
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        primary_fungible_store::deposit(signer::address_of(&resource_signer), primary_fungible_store::withdraw(sender, metadata, total_amount));

        let new_stream = Stream<FaDetails> {
            sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp,
            flow_rate_per_second: (total_amount as u128) / (duration as u128),
            withdrawn_amount: 0, is_active: true, last_pause_time: 0,
            asset_details: FaDetails { metadata_addr, resource_signer_cap },
        };
        table::add(&mut stream_hub.streams, stream_id, new_stream);
        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated { stream_id, sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp, asset_type: fungible_asset::name(metadata) });
    }

    public entry fun create_stream_by_rate_fa(
        sender: &signer,
        recipient: address,
        metadata_addr: address,
        amount_per_interval: u64,
        interval_unit: u8,
        duration_seconds: u64,
        cliff_duration_seconds: u64
    ) acquires StreamHub {
        let now = timestamp::now_seconds();
        let start_time = now;
        let end_time = now + duration_seconds;
        
        assert!(duration_seconds > 0, E_INVALID_DURATION);
        assert!(amount_per_interval > 0, E_INVALID_AMOUNT);
        let cliff_timestamp = start_time + cliff_duration_seconds;
        assert!(cliff_timestamp <= end_time, E_INVALID_CLIFF);

        let seconds_per_interval = if (interval_unit == UNIT_HOUR) {
            SECONDS_IN_HOUR
        } else if (interval_unit == UNIT_DAY) {
            SECONDS_IN_DAY
        } else if (interval_unit == UNIT_WEEK) {
            SECONDS_IN_WEEK
        } else if (interval_unit == UNIT_MONTH) {
            SECONDS_IN_MONTH
        } else {
            abort E_INVALID_INTERVAL
        };

        let total_amount = ((amount_per_interval as u128) * (duration_seconds as u128) / (seconds_per_interval as u128)) as u64;
        let flow_rate_per_second = (amount_per_interval as u128) / (seconds_per_interval as u128);
        assert!(total_amount > 0, E_INVALID_AMOUNT);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<FaDetails>>(sender_addr)) {
            initialize_hub_fa(sender);
        };
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id += 1;

        let (resource_signer, resource_signer_cap) = account::create_resource_account(sender, bcs::to_bytes(&stream_id));
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        primary_fungible_store::deposit(signer::address_of(&resource_signer), primary_fungible_store::withdraw(sender, metadata, total_amount));

        let new_stream = Stream<FaDetails> {
            sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp,
            flow_rate_per_second, withdrawn_amount: 0, is_active: true, last_pause_time: 0,
            asset_details: FaDetails { metadata_addr, resource_signer_cap },
        };
        table::add(&mut stream_hub.streams, stream_id, new_stream);
        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated { stream_id, sender: sender_addr, recipient, total_amount, start_time, end_time, cliff_timestamp, asset_type: fungible_asset::name(metadata) });
    }

    public entry fun withdraw_from_stream_fa(recipient: &signer, sender_addr: address, stream_id: u64) acquires StreamHub {
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.recipient == signer::address_of(recipient), E_UNAUTHORIZED);
        
        let claimable = internal_calculate_claimable(stream);
        assert!(claimable > 0, E_ZERO_BALANCE_TO_WITHDRAW);
        stream.withdrawn_amount += claimable;

        let resource_signer = account::create_signer_with_capability(&stream.asset_details.resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(stream.asset_details.metadata_addr);
        let asset = primary_fungible_store::withdraw(&resource_signer, metadata, claimable);
        primary_fungible_store::deposit(stream.recipient, asset);
        event::emit_event(&mut stream_hub.stream_withdrawn_events, StreamWithdrawn { stream_id, recipient: stream.recipient, withdrawn_amount: claimable });
    }

    public entry fun pause_stream_fa(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(stream.is_active, E_STREAM_NOT_ACTIVE);
        stream.is_active = false;
        stream.last_pause_time = timestamp::now_seconds();
        event::emit_event(&mut stream_hub.stream_paused_events, StreamPaused { stream_id, timestamp: stream.last_pause_time });
    }

    public entry fun resume_stream_fa(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream = table::borrow_mut(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(!stream.is_active, E_STREAM_ALREADY_ACTIVE);
        let pause_duration = timestamp::now_seconds() - stream.last_pause_time;
        stream.end_time += pause_duration;
        stream.is_active = true;
        stream.last_pause_time = 0;
        event::emit_event(&mut stream_hub.stream_resumed_events, StreamResumed { stream_id, new_end_time: stream.end_time });
    }

    public entry fun cancel_stream_fa(canceler: &signer, sender_addr: address, stream_id: u64) acquires StreamHub {
        let canceler_addr = signer::address_of(canceler);
        let stream_hub = borrow_global_mut<StreamHub<FaDetails>>(sender_addr);
        let stream = table::remove(&mut stream_hub.streams, stream_id);
        assert!(stream.sender == canceler_addr || stream.recipient == canceler_addr, E_UNAUTHORIZED);
        
        let recipient_final_amount = internal_calculate_claimable(&stream);
        
        let Stream {
            sender,
            recipient,
            total_amount,
            withdrawn_amount,
            asset_details: FaDetails { metadata_addr, resource_signer_cap },
            ..
        } = stream;
        
        let resource_signer = account::create_signer_with_capability(&resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(metadata_addr);

        if (recipient_final_amount > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, recipient_final_amount);
            primary_fungible_store::deposit(recipient, asset);
        };

        let sender_return_amount = total_amount - withdrawn_amount - recipient_final_amount;
        if (sender_return_amount > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, sender_return_amount);
            primary_fungible_store::deposit(sender, asset);
        };

        event::emit_event(&mut stream_hub.stream_canceled_events, StreamCanceled { stream_id, sender, recipient, sender_return_amount, recipient_final_amount });
    }

    #[view]
    public fun view_claimable_amount_coin<CoinType>(sender_addr: address, stream_id: u64): u64 acquires StreamHub {
        let stream_hub = borrow_global<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::borrow(&stream_hub.streams, stream_id);
        internal_calculate_claimable(stream)
    }

    #[view]
    public fun o(sender_addr: address, stream_id: u64): u64 acquires StreamHub {
        let stream_hub = borrow_global<StreamHub<FaDetails>>(sender_addr);
        let stream = table::borrow(&stream_hub.streams, stream_id);
        internal_calculate_claimable(stream)
    }

    #[view]
    public fun get_flow_rate_coin<CoinType>(sender_addr: address, stream_id: u64): (u128, u128, u128, u128, u128, u128) acquires StreamHub {
        let stream_hub = borrow_global<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        let stream = table::borrow(&stream_hub.streams, stream_id);
        let rate_sec = stream.flow_rate_per_second;
        let rate_min = rate_sec * 60;
        let rate_hr = rate_min * 60;
        let rate_day = rate_hr * 24;
        let rate_week = rate_day * 7;
        let rate_month = rate_day * 30; // 30-day month approximation
        (rate_sec, rate_min, rate_hr, rate_day, rate_week, rate_month)
    }

    #[view]
    public fun get_flow_rate_fa(sender_addr: address, stream_id: u64): (u128, u128, u128, u128, u128, u128) acquires StreamHub {
        let stream_hub = borrow_global<StreamHub<FaDetails>>(sender_addr);
        let stream = table::borrow(&stream_hub.streams, stream_id);
        let rate_sec = stream.flow_rate_per_second;
        let rate_min = rate_sec * 60;
        let rate_hr = rate_min * 60;
        let rate_day = rate_hr * 24;
        let rate_week = rate_day * 7;
        let rate_month = rate_day * 30; // 30-day month approximation
        (rate_sec, rate_min, rate_hr, rate_day, rate_week, rate_month)
    }

     #[view]
    public fun get_next_stream_id_coin<CoinType>(sender_addr: address): u64 acquires StreamHub {
        assert!(exists<StreamHub<CoinDetails<CoinType>>>(sender_addr), E_NOT_INITIALIZED);
        borrow_global<StreamHub<CoinDetails<CoinType>>>(sender_addr).next_stream_id
    }

    #[view]
    public fun get_next_stream_id_fa(sender_addr: address): u64 acquires StreamHub {
        assert!(exists<StreamHub<FaDetails>>(sender_addr), E_NOT_INITIALIZED);
        borrow_global<StreamHub<FaDetails>>(sender_addr).next_stream_id
    }

    #[view]
    public fun get_stream_details_coin<CoinType>(sender_addr: address, stream_id: u64): StreamDetails acquires StreamHub {
        assert!(exists<StreamHub<CoinDetails<CoinType>>>(sender_addr), E_NOT_INITIALIZED);
        let stream_hub = borrow_global<StreamHub<CoinDetails<CoinType>>>(sender_addr);
        assert!(table::contains(&stream_hub.streams, stream_id), E_STREAM_NOT_FOUND);
        
        let stream = table::borrow(&stream_hub.streams, stream_id);

        StreamDetails {
            stream_id,
            sender: stream.sender,
            recipient: stream.recipient,
            total_amount: stream.total_amount,
            withdrawn_amount: stream.withdrawn_amount,
            start_time: stream.start_time,
            end_time: stream.end_time,
            cliff_timestamp: stream.cliff_timestamp,
            is_active: stream.is_active,
            flow_rate_per_second: stream.flow_rate_per_second,
        }
    }

    #[view]
    public fun get_stream_details_fa(sender_addr: address, stream_id: u64): StreamDetails acquires StreamHub {
        assert!(exists<StreamHub<FaDetails>>(sender_addr), E_NOT_INITIALIZED);
        let stream_hub = borrow_global<StreamHub<FaDetails>>(sender_addr);
        assert!(table::contains(&stream_hub.streams, stream_id), E_STREAM_NOT_FOUND);

        let stream = table::borrow(&stream_hub.streams, stream_id);
        
        StreamDetails {
            stream_id,
            sender: stream.sender,
            recipient: stream.recipient,
            total_amount: stream.total_amount,
            withdrawn_amount: stream.withdrawn_amount,
            start_time: stream.start_time,
            end_time: stream.end_time,
            cliff_timestamp: stream.cliff_timestamp,
            is_active: stream.is_active,
            flow_rate_per_second: stream.flow_rate_per_second,
        }
    }
}