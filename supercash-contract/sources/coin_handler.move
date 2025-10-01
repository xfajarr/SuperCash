/// Generic Coin Handler for SuperCash Payments System
/// Provides reflection-like capabilities to handle any Coin type dynamically
module supercash::coin_handler {
    use std::signer;
    use std::string::{Self, String};
    use std::option::{Self, Option};
    use std::vector;
    use std::event;
    
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;

    const E_UNAUTHORIZED: u64 = 0x50001; // Unauthorized error
    const E_COIN_NOT_SUPPORTED: u64 = 0x50002; // Coin type not supported error
    
    /// Registry of supported Coin types with their metadata
    struct CoinRegistry has key {
        coins: vector<CoinType>,
    }
    
    /// Metadata for a registered Coin type
    struct CoinType has store, drop {
        type_name: String,
        module_address: address,
        module_name: String,
        struct_name: String,
        decimals: u8,
        is_active: bool,
    }
    
    /// Event emitted when a new Coin type is registered
    #[event]
    struct CoinRegisteredEvent has drop, store {
        type_name: String,
        decimals: u8,
        timestamp: u64,
    }
    
    /// Initialize the coin registry with default coins
    fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        // Initialize with AptosCoin as the default
        let coins = vector::empty<CoinType>();
        coins.push_back(CoinType {
            type_name: std::string::utf8(b"0x1::aptos_coin::AptosCoin"),
            module_address: @0x1,
            module_name: std::string::utf8(b"aptos_coin"),
            struct_name: std::string::utf8(b"AptosCoin"),
            decimals: 8,
            is_active: true,
        });
        
        move_to(deployer, CoinRegistry { coins });
    }
    
    /// Register a new Coin type with the system
    public entry fun register_coin(
        admin: &signer,
        type_name: String,
        module_address: address,
        module_name: String,
        struct_name: String,
        decimals: u8
    ) acquires CoinRegistry {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @supercash;
        
        // Only the contract deployer can register new coins
        assert!(admin_addr == deployer_addr, E_UNAUTHORIZED); // Unauthorized error
        
        // Check if the coin is already registered
        let registry = borrow_global_mut<CoinRegistry>(deployer_addr);
        let coins = &mut registry.coins;
        
        let i = 0;
        let len = coins.length();
        while (i < len) {
            let coin = coins.borrow(i);
            if (coin.type_name == type_name) {
                // Update existing coin
                let coin_mut = coins.borrow_mut(i);
                coin_mut.decimals = decimals;
                coin_mut.is_active = true;
                return
            };
            i += 1;
        };
        
        // Add new coin type
        coins.push_back(CoinType {
            type_name,
            module_address,
            module_name,
            struct_name,
            decimals,
            is_active: true,
        });
        
        // Emit event
        event::emit(CoinRegisteredEvent {
            type_name,
            decimals,
            timestamp: timestamp::now_seconds(),
        });
    }
    
    /// Transfer AptosCoin (optimized for the most common case)
    public fun transfer_aptos_coin(
        sender: &signer,
        recipient: address,
        amount: u64
    ) {
        coin::transfer<AptosCoin>(sender, recipient, amount);
    }
    
    /// Get coin information by type name
    public fun get_coin_info(type_name: String): (address, String, String, u8, bool) acquires CoinRegistry {
        let deployer_addr = @supercash;
        let registry = borrow_global<CoinRegistry>(deployer_addr);
        let coins = &registry.coins;
        
        // Find the coin type by name
        let i = 0;
        let len = coins.length();
        while (i < len) {
            let coin = coins.borrow(i);
            if (coin.type_name == type_name) {
                return (coin.module_address, coin.module_name, coin.struct_name, coin.decimals, coin.is_active)
            };
            i += 1;
        };
        
        // Coin type not found
        (@0x0, std::string::utf8(b""), std::string::utf8(b""), 0, false)
    }
    
    /// Get all registered coin types
    public fun get_registered_coins(): vector<String> acquires CoinRegistry {
        let deployer_addr = @supercash;
        let registry = borrow_global<CoinRegistry>(deployer_addr);
        let coins = &registry.coins;
        let result = vector::empty<String>();
        
        let i = 0;
        let len = coins.length();
        while (i < len) {
            let coin = coins.borrow(i);
            if (coin.is_active) {
                result.push_back(coin.type_name);
            };
            i += 1;
        };
        
        result
    }
    
    /// Check if a coin type is supported
    public fun is_coin_supported(type_name: String): bool acquires CoinRegistry {
        let deployer_addr = @supercash;
        let registry = borrow_global<CoinRegistry>(deployer_addr);
        let coins = &registry.coins;
        
        // Find the coin type by name
        let i = 0;
        let len = coins.length();
        while (i < len) {
            let coin = coins.borrow(i);
            if (coin.type_name == type_name && coin.is_active) {
                return true
            };
            i += 1;
        };
        
        false
    }
    
    /// Activate or deactivate a coin type
    public entry fun set_coin_active(
        admin: &signer,
        type_name: String,
        is_active: bool
    ) acquires CoinRegistry {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @supercash;
        
        // Only the contract deployer can activate/deactivate coins
        assert!(admin_addr == deployer_addr, E_UNAUTHORIZED); // Unauthorized error
        
        let registry = borrow_global_mut<CoinRegistry>(deployer_addr);
        let coins = &mut registry.coins;
        
        // Find the coin type by name
        let i = 0;
        let len = coins.length();
        while (i < len) {
            let coin = coins.borrow(i);
            if (coin.type_name == type_name) {
                let coin_mut = coins.borrow_mut(i);
                coin_mut.is_active = is_active;
                return
            };
            i += 1;
        };
        
        // Coin type not found
        abort(E_COIN_NOT_SUPPORTED); // Coin type not supported error
    }
    
    #[test_only]
    public fun init_module_for_test(deployer: &signer) {
        init_module(deployer);
    }
}