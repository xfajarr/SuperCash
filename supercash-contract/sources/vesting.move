module supercash::periodic_vesting {
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

    // --- Errors ---
    const E_NOT_INITIALIZED: u64 = 1;
    const E_ALREADY_INITIALIZED: u64 = 2;
    const E_SCHEDULE_NOT_FOUND: u64 = 3;
    const E_UNAUTHORIZED: u64 = 4;
    const E_ZERO_BALANCE_TO_CLAIM: u64 = 5;
    const E_INVALID_SCHEDULE_PARAMS: u64 = 6;
    const E_AMOUNT_NOT_DIVISIBLE: u64 = 7;

    // --- Events ---
    struct ScheduleCreated has drop, store { schedule_id: u64, creator: address, beneficiary: address, total_amount: u64, num_periods: u64, end_time: u64, asset_type: String }
    struct ScheduleClaimed has drop, store { schedule_id: u64, beneficiary: address, claimed_amount: u64 }
    struct ScheduleCanceled has drop, store { schedule_id: u64, creator: address, beneficiary: address, creator_return_amount: u64, beneficiary_final_amount: u64 }

    // --- Data Structures ---
    struct VestingSchedule<AssetDetails: store> has store {
        creator: address,
        beneficiary: address,
        total_amount: u64,
        start_time: u64,
        cliff_duration: u64,
        period_duration: u64,
        num_periods: u64,
        amount_per_period: u64,
        withdrawn_amount: u64,
        asset_details: AssetDetails,
    }

    struct CoinDetails<phantom CoinType> has store { escrowed_asset: Coin<CoinType> }
    struct FaDetails has store { metadata_addr: address, resource_signer_cap: account::SignerCapability }

    struct VestingHub<AssetDetails: store> has key {
        schedules: Table<u64, VestingSchedule<AssetDetails>>,
        next_schedule_id: u64,
        schedule_created_events: EventHandle<ScheduleCreated>,
        schedule_claimed_events: EventHandle<ScheduleClaimed>,
        schedule_canceled_events: EventHandle<ScheduleCanceled>,
    }

    // --- Internal Core Logic ---
    fun internal_calculate_claimable_vesting<AssetDetails: store>(schedule: &VestingSchedule<AssetDetails>): u64 {
        let now = timestamp::now_seconds();
        let cliff_end = schedule.start_time + schedule.cliff_duration;
        if (now < cliff_end) { return 0 };

        if (schedule.period_duration == 0) {
            return schedule.total_amount - schedule.withdrawn_amount
        };

        let time_since_cliff = now - cliff_end;
        let periods_unlocked = time_since_cliff / schedule.period_duration;

        if (periods_unlocked > schedule.num_periods) {
            periods_unlocked = schedule.num_periods;
        };
        
        let vesting_end_time = cliff_end + (schedule.num_periods * schedule.period_duration);
        let total_unlocked = if (now >= vesting_end_time) {
            schedule.total_amount
        } else {
            periods_unlocked * schedule.amount_per_period
        };
        total_unlocked - schedule.withdrawn_amount
    }

    // --- Coin Functions ---
    public entry fun initialize_hub_coin<CoinType>(account: &signer) {
        assert!(!exists<VestingHub<CoinDetails<CoinType>>>(signer::address_of(account)), E_ALREADY_INITIALIZED);
        move_to(account, VestingHub<CoinDetails<CoinType>> {
            schedules: table::new(),
            next_schedule_id: 0,
            schedule_created_events: account::new_event_handle<ScheduleCreated>(account),
            schedule_claimed_events: account::new_event_handle<ScheduleClaimed>(account),
            schedule_canceled_events: account::new_event_handle<ScheduleCanceled>(account),
        });
    }

    public entry fun create_vesting_schedule_coin<CoinType>(creator: &signer, beneficiary: address, total_amount: u64, start_time: u64, cliff_duration_seconds: u64, period_duration_seconds: u64, num_periods: u64) acquires VestingHub {
        assert!(num_periods > 0 && period_duration_seconds > 0, E_INVALID_SCHEDULE_PARAMS);
        assert!(total_amount % num_periods == 0, E_AMOUNT_NOT_DIVISIBLE);

        let creator_addr = signer::address_of(creator);
        if (!exists<VestingHub<CoinDetails<CoinType>>>(creator_addr)) {
            initialize_hub_coin<CoinType>(creator);
        };
        let hub = borrow_global_mut<VestingHub<CoinDetails<CoinType>>>(creator_addr);
        let schedule_id = hub.next_schedule_id;
        hub.next_schedule_id += 1;

        let schedule = VestingSchedule<CoinDetails<CoinType>> {
            creator: creator_addr, beneficiary, total_amount, start_time,
            cliff_duration: cliff_duration_seconds, period_duration: period_duration_seconds, num_periods,
            amount_per_period: total_amount / num_periods, withdrawn_amount: 0,
            asset_details: CoinDetails<CoinType> { escrowed_asset: coin::withdraw<CoinType>(creator, total_amount) },
        };
        hub.schedules.add(schedule_id, schedule);
        event::emit_event(&mut hub.schedule_created_events, ScheduleCreated { schedule_id, creator: creator_addr, beneficiary, total_amount, num_periods, end_time: start_time + cliff_duration_seconds + (period_duration_seconds * num_periods), asset_type: type_info::type_name<CoinType>() });
    }

    public entry fun claim_vested_tokens_coin<CoinType>(beneficiary: &signer, creator_addr: address, schedule_id: u64) acquires VestingHub {
        let hub = borrow_global_mut<VestingHub<CoinDetails<CoinType>>>(creator_addr);
        let schedule = hub.schedules.borrow_mut(schedule_id);
        assert!(schedule.beneficiary == signer::address_of(beneficiary), E_UNAUTHORIZED);

        let claimable = internal_calculate_claimable_vesting(schedule);
        assert!(claimable > 0, E_ZERO_BALANCE_TO_CLAIM);

        schedule.withdrawn_amount += claimable;
        coin::deposit(schedule.beneficiary, coin::extract(&mut schedule.asset_details.escrowed_asset, claimable));
        event::emit_event(&mut hub.schedule_claimed_events, ScheduleClaimed { schedule_id, beneficiary: schedule.beneficiary, claimed_amount: claimable });
    }

    public entry fun cancel_vesting_schedule_coin<CoinType>(canceler: &signer, creator_addr: address, schedule_id: u64) acquires VestingHub {
        let canceler_addr = signer::address_of(canceler);
        let hub = borrow_global_mut<VestingHub<CoinDetails<CoinType>>>(creator_addr);
        let schedule = hub.schedules.remove(schedule_id);
        assert!(schedule.creator == canceler_addr || schedule.beneficiary == canceler_addr, E_UNAUTHORIZED);

        let beneficiary_final_amount = internal_calculate_claimable_vesting(&schedule);
        
        let VestingSchedule {
            creator,
            beneficiary,
            asset_details: CoinDetails { escrowed_asset },
            ..
        } = schedule;

        if (beneficiary_final_amount > 0) {
            coin::deposit(beneficiary, coin::extract(&mut escrowed_asset, beneficiary_final_amount));
        };

        let remaining_coin = coin::extract_all(&mut escrowed_asset);
        let creator_return_amount = coin::value(&remaining_coin);
        coin::deposit(creator, remaining_coin);
        coin::destroy_zero(escrowed_asset);

        event::emit_event(&mut hub.schedule_canceled_events, ScheduleCanceled { schedule_id, creator, beneficiary, creator_return_amount, beneficiary_final_amount });
    }

    // --- Fungible Asset Functions ---
    public entry fun initialize_hub_fa(account: &signer) {
        assert!(!exists<VestingHub<FaDetails>>(signer::address_of(account)), E_ALREADY_INITIALIZED);
        move_to(account, VestingHub<FaDetails> {
            schedules: table::new(),
            next_schedule_id: 0,
            schedule_created_events: account::new_event_handle<ScheduleCreated>(account),
            schedule_claimed_events: account::new_event_handle<ScheduleClaimed>(account),
            schedule_canceled_events: account::new_event_handle<ScheduleCanceled>(account),
        });
    }

    public entry fun create_vesting_schedule_fa(creator: &signer, beneficiary: address, metadata_addr: address, total_amount: u64, start_time: u64, cliff_duration_seconds: u64, period_duration_seconds: u64, num_periods: u64) acquires VestingHub {
        assert!(num_periods > 0 && period_duration_seconds > 0, E_INVALID_SCHEDULE_PARAMS);
        assert!(total_amount % num_periods == 0, E_AMOUNT_NOT_DIVISIBLE);

        let creator_addr = signer::address_of(creator);
        if (!exists<VestingHub<FaDetails>>(creator_addr)) {
            initialize_hub_fa(creator);
        };
        let hub = borrow_global_mut<VestingHub<FaDetails>>(creator_addr);
        let schedule_id = hub.next_schedule_id;
        hub.next_schedule_id += 1;
        
        let (resource_signer, resource_signer_cap) = account::create_resource_account(creator, bcs::to_bytes(&schedule_id));
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        primary_fungible_store::deposit(signer::address_of(&resource_signer), primary_fungible_store::withdraw(creator, metadata, total_amount));

        let schedule = VestingSchedule<FaDetails> {
            creator: creator_addr, beneficiary, total_amount, start_time,
            cliff_duration: cliff_duration_seconds, period_duration: period_duration_seconds, num_periods,
            amount_per_period: total_amount / num_periods, withdrawn_amount: 0,
            asset_details: FaDetails { metadata_addr, resource_signer_cap },
        };
        hub.schedules.add(schedule_id, schedule);
        event::emit_event(&mut hub.schedule_created_events, ScheduleCreated { schedule_id, creator: creator_addr, beneficiary, total_amount, num_periods, end_time: start_time + cliff_duration_seconds + (period_duration_seconds * num_periods), asset_type: fungible_asset::name(metadata) });
    }

    public entry fun claim_vested_tokens_fa(beneficiary: &signer, creator_addr: address, schedule_id: u64) acquires VestingHub {
        let hub = borrow_global_mut<VestingHub<FaDetails>>(creator_addr);
        let schedule = hub.schedules.borrow_mut(schedule_id);
        assert!(schedule.beneficiary == signer::address_of(beneficiary), E_UNAUTHORIZED);

        let claimable = internal_calculate_claimable_vesting(schedule);
        assert!(claimable > 0, E_ZERO_BALANCE_TO_CLAIM);
        schedule.withdrawn_amount += claimable;

        let resource_signer = account::create_signer_with_capability(&schedule.asset_details.resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(schedule.asset_details.metadata_addr);
        let asset = primary_fungible_store::withdraw(&resource_signer, metadata, claimable);
        primary_fungible_store::deposit(schedule.beneficiary, asset);
        event::emit_event(&mut hub.schedule_claimed_events, ScheduleClaimed { schedule_id, beneficiary: schedule.beneficiary, claimed_amount: claimable });
    }

    public entry fun cancel_vesting_schedule_fa(canceler: &signer, creator_addr: address, schedule_id: u64) acquires VestingHub {
        let canceler_addr = signer::address_of(canceler);
        let hub = borrow_global_mut<VestingHub<FaDetails>>(creator_addr);
        let schedule = hub.schedules.remove(schedule_id);
        assert!(schedule.creator == canceler_addr || schedule.beneficiary == canceler_addr, E_UNAUTHORIZED);

        let beneficiary_final_amount = internal_calculate_claimable_vesting(&schedule);
        
        let VestingSchedule {
            creator,
            beneficiary,
            total_amount,
            withdrawn_amount,
            asset_details: FaDetails { metadata_addr, resource_signer_cap },
            ..
        } = schedule;

        let resource_signer = account::create_signer_with_capability(&resource_signer_cap);
        let metadata = object::address_to_object<Metadata>(metadata_addr);

        if (beneficiary_final_amount > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, beneficiary_final_amount);
            primary_fungible_store::deposit(beneficiary, asset);
        };

        let creator_return_amount = total_amount - withdrawn_amount - beneficiary_final_amount;
        if (creator_return_amount > 0) {
            let asset = primary_fungible_store::withdraw(&resource_signer, metadata, creator_return_amount);
            primary_fungible_store::deposit(creator, asset);
        };
        
        event::emit_event(&mut hub.schedule_canceled_events, ScheduleCanceled { schedule_id, creator, beneficiary, creator_return_amount, beneficiary_final_amount });
    }
    
    // --- Public View Functions ---
    #[view]
    public fun view_claimable_amount_coin<CoinType>(creator_addr: address, schedule_id: u64): u64 acquires VestingHub {
        let hub = borrow_global<VestingHub<CoinDetails<CoinType>>>(creator_addr);
        let schedule = hub.schedules.borrow(schedule_id);
        internal_calculate_claimable_vesting(schedule)
    }

    #[view]
    public fun view_claimable_amount_fa(creator_addr: address, schedule_id: u64): u64 acquires VestingHub {
        let hub = borrow_global<VestingHub<FaDetails>>(creator_addr);
        let schedule = hub.schedules.borrow(schedule_id);
        internal_calculate_claimable_vesting(schedule)
    }
}