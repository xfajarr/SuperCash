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
    const E_STREAM_COMPLETED: u64 = 6;
    const E_INVALID_DURATION: u64 = 7;
    const E_INVALID_AMOUNT: u64 = 8;
    const E_UNAUTHORIZED: u64 = 9;
    const E_ZERO_BALANCE_TO_WITHDRAW: u64 = 10;

    struct StreamCreated has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        total_amount: u64,
        end_time: u64,
        asset_type: String,
    }
    struct StreamWithdrawn has drop, store {
        stream_id: u64,
        recipient: address,
        withdrawn_amount: u64,
    }
    struct StreamPaused has drop, store {
        stream_id: u64,
        timestamp: u64,
    }
    struct StreamResumed has drop, store {
        stream_id: u64,
        new_end_time: u64,
    }
    struct StreamCanceled has drop, store {
        stream_id: u64,
        sender: address,
        recipient: address,
        sender_return_amount: u64,
        recipient_final_amount: u64,
    }

    /// Represents an active stream for a legacy `Coin` type.
    struct StreamCoin<phantom CoinType> has store {
        sender: address,
        recipient: address,
        total_amount: u64,
        start_time: u64,
        end_time: u64,
        flow_rate_per_second: u128,
        withdrawn_amount: u64,
        is_active: bool,
        last_pause_time: u64,
        escrowed_asset: Coin<CoinType>,
    }

    /// Represents an active stream for a modern `FungibleAsset` type.
    struct StreamFA has store {
        sender: address,
        recipient: address,
        total_amount: u64,
        start_time: u64,
        end_time: u64,
        flow_rate_per_second: u128,
        withdrawn_amount: u64,
        is_active: bool,
        last_pause_time: u64,
        metadata_addr: address,
        resource_signer_cap: account::SignerCapability,
    }

    /// Resource Hub holding all streams for a specific user and asset type.
    struct StreamHub<phantom AssetType> has key {
        streams: Table<u64, AssetType>,
        next_stream_id: u64,
        stream_created_events: EventHandle<StreamCreated>,
        stream_withdrawn_events: EventHandle<StreamWithdrawn>,
        stream_paused_events: EventHandle<StreamPaused>,
        stream_resumed_events: EventHandle<StreamResumed>,
        stream_canceled_events: EventHandle<StreamCanceled>,
    }

    /// Calculates the currently claimable amount for a stream.
    #[view]
    public fun calculate_claimable(
        start_time: u64,
        end_time: u64,
        flow_rate: u128,
        total_amount: u64,
        withdrawn_amount: u64,
        is_active: bool,
        last_pause_time: u64
    ): u64 {
        let now = timestamp::now_seconds();
        if (now >= end_time) {
            return total_amount - withdrawn_amount
        };

        let effective_time = if (is_active) now else last_pause_time;
        
        if (effective_time <= start_time) {
            return 0
        };

        let duration_streamed = (effective_time - start_time) as u128;
        let total_earned = duration_streamed * flow_rate;
        
        // Ensure total earned does not exceed the total amount due to precision.
        if (total_earned > (total_amount as u128)) {
            total_earned = (total_amount as u128);
        };

        let claimable = (total_earned as u64) - withdrawn_amount;
        claimable
    }

    public entry fun initialize_hub_coin<CoinType>(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<StreamHub<StreamCoin<CoinType>>>(addr), E_ALREADY_INITIALIZED);
        move_to(account, StreamHub<StreamCoin<CoinType>> {
            streams: table::new(),
            next_stream_id: 0,
            stream_created_events: account::new_event_handle<StreamCreated>(account),
            stream_withdrawn_events: account::new_event_handle<StreamWithdrawn>(account),
            stream_paused_events: account::new_event_handle<StreamPaused>(account),
            stream_resumed_events: account::new_event_handle<StreamResumed>(account),
            stream_canceled_events: account::new_event_handle<StreamCanceled>(account),
        });
    }

    public entry fun create_stream_coin<CoinType>(
        sender: &signer,
        recipient: address,
        total_amount: u64,
        duration_seconds: u64,
    ) acquires StreamHub {
        assert!(duration_seconds > 0, E_INVALID_DURATION);
        assert!(total_amount > 0, E_INVALID_AMOUNT);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<StreamCoin<CoinType>>>(sender_addr)) {
            initialize_hub_coin<CoinType>(sender);
        };

        let stream_hub = borrow_global_mut<StreamHub<StreamCoin<CoinType>>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id = stream_id + 1;

        let now = timestamp::now_seconds();
        let end_time = now + duration_seconds;
        let flow_rate = (total_amount as u128) / (duration_seconds as u128);

        let escrowed_asset = coin::withdraw<CoinType>(sender, total_amount);
        let new_stream = StreamCoin<CoinType> {
            sender: sender_addr, recipient, total_amount, start_time: now, end_time,
            flow_rate_per_second: flow_rate, withdrawn_amount: 0, is_active: true,
            last_pause_time: 0, escrowed_asset,
        };
        stream_hub.streams.add(stream_id, new_stream);

        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated {
            stream_id, sender: sender_addr, recipient, total_amount, end_time,
            asset_type: type_info::type_name<CoinType>(),
        });
    }

    public entry fun withdraw_from_stream_coin<CoinType>(
        recipient: &signer,
        sender_addr: address,
        stream_id: u64,
    ) acquires StreamHub {
        let recipient_addr = signer::address_of(recipient);
        assert!(exists<StreamHub<StreamCoin<CoinType>>>(sender_addr), E_STREAM_NOT_FOUND);
        let stream_hub = borrow_global_mut<StreamHub<StreamCoin<CoinType>>>(sender_addr);
        assert!(stream_hub.streams.contains(stream_id), E_STREAM_NOT_FOUND);

        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.recipient == recipient_addr, E_UNAUTHORIZED);

        let claimable = calculate_claimable(
            stream.start_time, stream.end_time, stream.flow_rate_per_second,
            stream.total_amount, stream.withdrawn_amount, stream.is_active, stream.last_pause_time
        );
        assert!(claimable > 0, E_ZERO_BALANCE_TO_WITHDRAW);

        stream.withdrawn_amount += claimable;
        let to_withdraw = coin::extract(&mut stream.escrowed_asset, claimable);
        coin::deposit(recipient_addr, to_withdraw);

        event::emit_event(&mut stream_hub.stream_withdrawn_events, StreamWithdrawn {
            stream_id, recipient: recipient_addr, withdrawn_amount: claimable,
        });
    }

    public entry fun pause_stream_coin<CoinType>(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<StreamCoin<CoinType>>>(sender_addr);
        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(stream.is_active, E_STREAM_NOT_ACTIVE);

        stream.is_active = false;
        stream.last_pause_time = timestamp::now_seconds();

        event::emit_event(&mut stream_hub.stream_paused_events, StreamPaused {
            stream_id, timestamp: stream.last_pause_time,
        });
    }

    public entry fun resume_stream_coin<CoinType>(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<StreamCoin<CoinType>>>(sender_addr);
        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(!stream.is_active, E_STREAM_ALREADY_ACTIVE);

        let now = timestamp::now_seconds();
        let pause_duration = now - stream.last_pause_time;
        stream.end_time += pause_duration;
        stream.is_active = true;
        stream.last_pause_time = 0;

        event::emit_event(&mut stream_hub.stream_resumed_events, StreamResumed {
            stream_id, new_end_time: stream.end_time,
        });
    }

public entry fun cancel_stream_coin<CoinType>(
        canceler: &signer,
        sender_addr: address,
        stream_id: u64,
    ) acquires StreamHub {
        let canceler_addr = signer::address_of(canceler);
        let stream_hub = borrow_global_mut<StreamHub<StreamCoin<CoinType>>>(sender_addr);
        let stream_struct = stream_hub.streams.remove(stream_id);
        let StreamCoin {
            sender, recipient, total_amount, start_time, end_time, flow_rate_per_second,
            withdrawn_amount, is_active, last_pause_time, escrowed_asset,
        } = stream_struct;
        assert!(sender == canceler_addr || recipient == canceler_addr, E_UNAUTHORIZED);
        let recipient_final_amount = calculate_claimable(
            start_time, end_time, flow_rate_per_second, total_amount,
            withdrawn_amount, is_active, last_pause_time
        );
        let escrow = escrowed_asset;
        if (recipient_final_amount > 0) {
            coin::deposit(recipient, coin::extract(&mut escrow, recipient_final_amount));
        };
        let remaining_coin = coin::extract_all(&mut escrow);
        let sender_return_amount = coin::value(&remaining_coin);
        coin::deposit(sender, remaining_coin);
        // The original `escrow` is now empty and can be safely discarded.
        coin::destroy_zero(escrow);
        event::emit_event(&mut stream_hub.stream_canceled_events, StreamCanceled {
            stream_id, sender, recipient, sender_return_amount, recipient_final_amount,
        });
    }

    public entry fun initialize_hub_fa(account: &signer) {
        let addr = signer::address_of(account);
        assert!(!exists<StreamHub<StreamFA>>(addr), E_ALREADY_INITIALIZED);
        move_to(account, StreamHub<StreamFA> {
            streams: table::new(),
            next_stream_id: 0,
            stream_created_events: account::new_event_handle<StreamCreated>(account),
            stream_withdrawn_events: account::new_event_handle<StreamWithdrawn>(account),
            stream_paused_events: account::new_event_handle<StreamPaused>(account),
            stream_resumed_events: account::new_event_handle<StreamResumed>(account),
            stream_canceled_events: account::new_event_handle<StreamCanceled>(account),
        });
    }

    public entry fun create_stream_fa(
        sender: &signer,
        recipient: address,
        metadata_addr: address,
        total_amount: u64,
        duration_seconds: u64,
    ) acquires StreamHub {
        assert!(duration_seconds > 0, E_INVALID_DURATION);
        assert!(total_amount > 0, E_INVALID_AMOUNT);

        let sender_addr = signer::address_of(sender);
        if (!exists<StreamHub<StreamFA>>(sender_addr)) {
            initialize_hub_fa(sender);
        };

        let stream_hub = borrow_global_mut<StreamHub<StreamFA>>(sender_addr);
        let stream_id = stream_hub.next_stream_id;
        stream_hub.next_stream_id = stream_id + 1;

        let now = timestamp::now_seconds();
        let end_time = now + duration_seconds;
        let flow_rate = (total_amount as u128) / (duration_seconds as u128);

        let (resource_signer, resource_signer_cap) = account::create_resource_account(sender, bcs::to_bytes(&stream_id));
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        primary_fungible_store::deposit(signer::address_of(&resource_signer), primary_fungible_store::withdraw(sender, metadata, total_amount));

        let new_stream = StreamFA {
            sender: sender_addr, recipient, total_amount, start_time: now, end_time,
            flow_rate_per_second: flow_rate, withdrawn_amount: 0, is_active: true,
            last_pause_time: 0, metadata_addr, resource_signer_cap,
        };
        stream_hub.streams.add(stream_id, new_stream);

        event::emit_event(&mut stream_hub.stream_created_events, StreamCreated {
            stream_id, sender: sender_addr, recipient, total_amount, end_time,
            asset_type: fungible_asset::name(metadata),
        });
    }

    public entry fun withdraw_from_stream_fa(
        recipient: &signer,
        sender_addr: address,
        stream_id: u64,
    ) acquires StreamHub {
        let recipient_addr = signer::address_of(recipient);
        let stream_hub = borrow_global_mut<StreamHub<StreamFA>>(sender_addr);
        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.recipient == recipient_addr, E_UNAUTHORIZED);

        let claimable = calculate_claimable(
            stream.start_time, stream.end_time, stream.flow_rate_per_second,
            stream.total_amount, stream.withdrawn_amount, stream.is_active, stream.last_pause_time
        );
        assert!(claimable > 0, E_ZERO_BALANCE_TO_WITHDRAW);

        stream.withdrawn_amount += claimable;
        let resource_signer = account::create_signer_with_capability(&stream.resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(stream.metadata_addr);
        let asset = primary_fungible_store::withdraw(&resource_signer, metadata, claimable);
        primary_fungible_store::deposit(recipient_addr, asset);

        event::emit_event(&mut stream_hub.stream_withdrawn_events, StreamWithdrawn {
            stream_id, recipient: recipient_addr, withdrawn_amount: claimable,
        });
    }

    public entry fun pause_stream_fa(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<StreamFA>>(sender_addr);
        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(stream.is_active, E_STREAM_NOT_ACTIVE);

        stream.is_active = false;
        stream.last_pause_time = timestamp::now_seconds();

        event::emit_event(&mut stream_hub.stream_paused_events, StreamPaused {
            stream_id, timestamp: stream.last_pause_time,
        });
    }

    public entry fun resume_stream_fa(sender: &signer, stream_id: u64) acquires StreamHub {
        let sender_addr = signer::address_of(sender);
        let stream_hub = borrow_global_mut<StreamHub<StreamFA>>(sender_addr);
        let stream = stream_hub.streams.borrow_mut(stream_id);
        assert!(stream.sender == sender_addr, E_UNAUTHORIZED);
        assert!(!stream.is_active, E_STREAM_ALREADY_ACTIVE);

        let now = timestamp::now_seconds();
        let pause_duration = now - stream.last_pause_time;
        stream.end_time += pause_duration;
        stream.is_active = true;
        stream.last_pause_time = 0;

        event::emit_event(&mut stream_hub.stream_resumed_events, StreamResumed {
            stream_id, new_end_time: stream.end_time,
        });
    }

    public entry fun cancel_stream_fa(
        canceler: &signer,
        sender_addr: address,
        stream_id: u64,
    ) acquires StreamHub {
        let canceler_addr = signer::address_of(canceler);
        let stream_hub = borrow_global_mut<StreamHub<StreamFA>>(sender_addr);
        let stream_struct = stream_hub.streams.remove(stream_id);
        let StreamFA {
            sender, recipient, total_amount, start_time, end_time, flow_rate_per_second,
            withdrawn_amount, is_active, last_pause_time, metadata_addr, resource_signer_cap,
        } = stream_struct;
        assert!(sender == canceler_addr || recipient == canceler_addr, E_UNAUTHORIZED);

        let recipient_final_amount = calculate_claimable(
            start_time, end_time, flow_rate_per_second, total_amount,
            withdrawn_amount, is_active, last_pause_time
        );

        let resource_signer = account::create_signer_with_capability(&resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(metadata_addr);

        if (recipient_final_amount > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, recipient_final_amount);
            primary_fungible_store::deposit(recipient, asset);
        };

        let remaining_balance = total_amount - withdrawn_amount - recipient_final_amount;
        if (remaining_balance > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, remaining_balance);
            primary_fungible_store::deposit(sender, asset);
        };
        
        event::emit_event(&mut stream_hub.stream_canceled_events, StreamCanceled {
            stream_id, sender, recipient, sender_return_amount: remaining_balance, recipient_final_amount,
        });
    }
}

