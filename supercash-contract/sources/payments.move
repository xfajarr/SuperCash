module supercash::payments {
    use std::signer;
    use std::string::{String};
    use aptos_framework::account;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self};
    use aptos_std::table::{Self, Table};
    use aptos_std::type_info;

    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;

    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_LINK_NOT_FOUND: u64 = 3;
    const E_LINK_ALREADY_CLAIMED: u64 = 4;
    const E_LINK_EXPIRED: u64 = 5;
    const E_INVALID_AMOUNT: u64 = 7;
    const E_UNAUTHORIZED: u64 = 8;
    const E_INVALID_HASH_LENGTH: u64 = 9;

        
    /// Escrow storage for `FungibleAsset`. Holds info and capability to control the escrow account.
    struct LinkTransferFA has store {
        sender: address,
        amount: u64,
        metadata_addr: address,
        // The SignerCapability allows the contract to sign transactions on behalf of the escrow account.
        resource_signer_cap: account::SignerCapability,
        created_at: u64,
        expires_at: u64,
        claimed: bool,
        claimer: address,
    }

    /// Resource Hub for modern `FungibleAsset` types.
    struct PaymentHubFA has key {
        link_transfers: Table<vector<u8>, LinkTransferFA>,
        link_created_events: EventHandle<LinkCreatedEvent>,
        link_claimed_events: EventHandle<LinkClaimedEvent>,
    }

    struct LinkCreatedEvent has drop, store {
        sender: address,
        amount: u64,
        link_hash: vector<u8>,
        expires_at: u64,
        timestamp: u64,
        asset_type: String,
    }

    struct LinkClaimedEvent has drop, store {
        claimer: address,
        sender: address,
        amount: u64,
        link_hash: vector<u8>,
        timestamp: u64,
        asset_type: String,
    }

    /// Escrow storage for legacy `Coin` types
    struct LinkTransferCoin<phantom CoinType> has store {
        sender: address,
        amount: u64,
        asset: Coin<CoinType>,
        created_at: u64,
        expires_at: u64,
        claimed: bool,
        claimer: address,
    }

    /// Resource Hub for legacy `Coin` types
    struct PaymentHubCoin<phantom CoinType> has key {
        link_transfers: Table<vector<u8>, LinkTransferCoin<CoinType>>,
        link_created_events: EventHandle<LinkCreatedEvent>,
        link_claimed_events: EventHandle<LinkClaimedEvent>,
    }

    /// Initialize a PaymentHub for a specific legacy `CoinType` (e.g., AptosCoin).
    public entry fun initialize_coin_hub<CoinType>(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(!exists<PaymentHubCoin<CoinType>>(account_addr), E_ALREADY_INITIALIZED);
        move_to(account, PaymentHubCoin<CoinType> {
            link_transfers: table::new(),
            link_created_events: account::new_event_handle<LinkCreatedEvent>(account),
            link_claimed_events: account::new_event_handle<LinkClaimedEvent>(account),
        });
    }

    /// Creates a payment link for legacy `Coin` assets (e.g., native AptosCoin).
    public entry fun create_link_coin<CoinType>(
        sender: &signer,
        amount: u64,
        link_hash: vector<u8>,
        expiry_duration_seconds: u64,
    ) acquires PaymentHubCoin {
        let sender_addr = signer::address_of(sender);
        if (!exists<PaymentHubCoin<CoinType>>(sender_addr)) {
            initialize_coin_hub<CoinType>(sender);
        };
        let payment_hub = borrow_global_mut<PaymentHubCoin<CoinType>>(sender_addr);
        assert!(!payment_hub.link_transfers.contains(link_hash), E_ALREADY_INITIALIZED);

        let asset_coin = coin::withdraw<CoinType>(sender, amount);
        let now = timestamp::now_seconds();
        let expires_at = now + expiry_duration_seconds;
        let link_transfer = LinkTransferCoin<CoinType> {
            sender: sender_addr, amount, asset: asset_coin, created_at: now,
            expires_at, claimed: false, claimer: @0x0,
        };
        payment_hub.link_transfers.add(link_hash, link_transfer);

        event::emit_event(&mut payment_hub.link_created_events, LinkCreatedEvent {
            sender: sender_addr, amount, link_hash, expires_at,
            timestamp: now, asset_type: type_info::type_name<CoinType>(),
        });
    }

    /// Initialize a PaymentHub for `FungibleAsset` links.
    public entry fun initialize_fa_hub(account: &signer) {
        let account_addr = signer::address_of(account);
        assert!(!exists<PaymentHubFA>(account_addr), E_ALREADY_INITIALIZED);
        move_to(account, PaymentHubFA {
            link_transfers: table::new(),
            link_created_events: account::new_event_handle<LinkCreatedEvent>(account),
            link_claimed_events: account::new_event_handle<LinkClaimedEvent>(account),
        });
    }

    /// Creates a payment link for modern `FungibleAsset` tokens (e.g., USDC, PYUSD).
    public entry fun create_link_fa(
        sender: &signer,
        metadata_addr: address,
        amount: u64,
        link_hash: vector<u8>,
        expiry_duration_seconds: u64,
    ) acquires PaymentHubFA {
        let sender_addr = signer::address_of(sender);
        if (!exists<PaymentHubFA>(sender_addr)) {
            initialize_fa_hub(sender);
        };
        let payment_hub = borrow_global_mut<PaymentHubFA>(sender_addr);
        assert!(!payment_hub.link_transfers.contains(link_hash), E_ALREADY_INITIALIZED);

        // 1. Create a new resource account to hold the escrowed funds.
        let (resource_signer, resource_signer_cap) = account::create_resource_account(sender, link_hash);
        let resource_addr = signer::address_of(&resource_signer);

        // 2. Withdraw the asset from the sender.
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        let asset = primary_fungible_store::withdraw(sender, metadata, amount);

        // 3. Deposit the asset into the newly created resource account.
        primary_fungible_store::deposit(resource_addr, asset);

        // 4. Store the link info and the capability to control the resource account.
        let now = timestamp::now_seconds();
        let expires_at = now + expiry_duration_seconds;
        let link_transfer = LinkTransferFA {
            sender: sender_addr, amount, metadata_addr, resource_signer_cap, created_at: now,
            expires_at, claimed: false, claimer: @0x0,
        };
        payment_hub.link_transfers.add(link_hash, link_transfer);

        event::emit_event(&mut payment_hub.link_created_events, LinkCreatedEvent {
            sender: sender_addr, amount, link_hash, expires_at,
            timestamp: now, asset_type: fungible_asset::name(metadata),
        });
    }

    /// Claims a payment link for any legacy `CoinType`.
    public entry fun claim_link_coin<CoinType>(
        claimer: &signer,
        sender_addr: address,
        link_hash: vector<u8>,
    ) acquires PaymentHubCoin {
        let claimer_addr = signer::address_of(claimer);
        let payment_hub = borrow_global_mut<PaymentHubCoin<CoinType>>(sender_addr);
        assert!(payment_hub.link_transfers.contains(link_hash), E_LINK_NOT_FOUND);

        let link_transfer = payment_hub.link_transfers.borrow_mut(link_hash);
        assert!(!link_transfer.claimed, E_LINK_ALREADY_CLAIMED);
        assert!(timestamp::now_seconds() <= link_transfer.expires_at, E_LINK_EXPIRED);

        link_transfer.claimed = true;
        link_transfer.claimer = claimer_addr;

        // Extract the coin from the escrow to deposit it, solving the ownership error.
        let asset_to_deposit = coin::extract_all(&mut link_transfer.asset);
        coin::deposit(claimer_addr, asset_to_deposit);

        event::emit_event(&mut payment_hub.link_claimed_events, LinkClaimedEvent {
            claimer: claimer_addr, sender: sender_addr, amount: link_transfer.amount,
            link_hash, timestamp: timestamp::now_seconds(), asset_type: type_info::type_name<CoinType>(),
        });
    }

    /// Claims a payment link for any modern `FungibleAsset`.
    public entry fun claim_link_fa(
        claimer: &signer,
        sender_addr: address,
        link_hash: vector<u8>,
    ) acquires PaymentHubFA {
        let claimer_addr = signer::address_of(claimer);
        let payment_hub = borrow_global_mut<PaymentHubFA>(sender_addr);
        assert!(payment_hub.link_transfers.contains(link_hash), E_LINK_NOT_FOUND);

        let link_transfer = payment_hub.link_transfers.borrow_mut(link_hash);
        assert!(!link_transfer.claimed, E_LINK_ALREADY_CLAIMED);
        assert!(timestamp::now_seconds() <= link_transfer.expires_at, E_LINK_EXPIRED);

        // 1. Generate the signer for the resource account from the stored capability.
        let resource_signer = account::create_signer_with_capability(&link_transfer.resource_signer_cap);

        // 2. Withdraw the asset from the resource account using its signer.
        let metadata = object::address_to_object<Metadata>(link_transfer.metadata_addr);
        let asset = primary_fungible_store::withdraw(&resource_signer, metadata, link_transfer.amount);

        // 3. Deposit the asset into the claimer's account.
        primary_fungible_store::deposit(claimer_addr, asset);

        link_transfer.claimed = true;
        link_transfer.claimer = claimer_addr;

        event::emit_event(&mut payment_hub.link_claimed_events, LinkClaimedEvent {
            claimer: claimer_addr, sender: sender_addr, amount: link_transfer.amount,
            link_hash, timestamp: timestamp::now_seconds(), asset_type: fungible_asset::name(metadata),
        });
    }

    /// Cancels a link and returns funds to the sender (`Coin` version).
    public entry fun cancel_link_coin<CoinType>(
        sender: &signer,
        link_hash: vector<u8>,
    ) acquires PaymentHubCoin {
        let sender_addr = signer::address_of(sender);
        let payment_hub = borrow_global_mut<PaymentHubCoin<CoinType>>(sender_addr);
        let link_transfer = payment_hub.link_transfers.remove(link_hash);
        
        // Deconstruct the struct to correctly handle the `asset` field which lacks `drop` ability.
        let LinkTransferCoin {
            sender: original_sender,
            amount: _,
            asset,
            created_at: _,
            expires_at: _,
            claimed,
            claimer: _,
        } = link_transfer;

        assert!(original_sender == sender_addr, E_UNAUTHORIZED);
        assert!(!claimed, E_LINK_ALREADY_CLAIMED);

        coin::deposit(sender_addr, asset);
    }

    /// Cancels a link and returns funds to the sender (`FA` version).
    public entry fun cancel_link_fa(
        sender: &signer,
        link_hash: vector<u8>,
    ) acquires PaymentHubFA {
        let sender_addr = signer::address_of(sender);
        let payment_hub = borrow_global_mut<PaymentHubFA>(sender_addr);
        let link_transfer = payment_hub.link_transfers.remove(link_hash);

        // Deconstruct the struct to correctly handle the `resource_signer_cap` which lacks `drop` ability.
        let LinkTransferFA {
            sender: original_sender,
            amount,
            metadata_addr,
            resource_signer_cap,
            created_at: _,
            expires_at: _,
            claimed,
            claimer: _,
        } = link_transfer;

        assert!(original_sender == sender_addr, E_UNAUTHORIZED);
        assert!(!claimed, E_LINK_ALREADY_CLAIMED);

        let resource_signer = account::create_signer_with_capability(&resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        let asset = primary_fungible_store::withdraw(&resource_signer, metadata, amount);
        
        primary_fungible_store::deposit(sender_addr, asset);
    }
}

