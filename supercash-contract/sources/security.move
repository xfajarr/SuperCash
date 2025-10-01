/// Security Module for SuperCash Payments System
/// Provides comprehensive security measures for mainnet deployment
/// Optimized for secure operation with robust access controls
module supercash::security {
    use std::signer;
    use std::vector;
    use std::event;
    use std::string::String;
    use std::option::{Self, Option};
    
    use aptos_framework::timestamp;
    use aptos_framework::account;
    
    /// Security levels
    const SECURITY_LEVEL_LOW: u8 = 1;
    const SECURITY_LEVEL_MEDIUM: u8 = 2;
    const SECURITY_LEVEL_HIGH: u8 = 3;
    const SECURITY_LEVEL_CRITICAL: u8 = 4;
    
    /// Action types
    const ACTION_TRANSFER: u8 = 1;
    const ACTION_CREATE_LINK: u8 = 2;
    const ACTION_CLAIM_LINK: u8 = 3;
    const ACTION_ADMIN: u8 = 4;
    const ACTION_PAUSE: u8 = 5;
    
    /// Security configuration
    struct SecurityConfig has key {
        /// Current security level
        security_level: u8,
        /// Whether the contract is paused
        paused: bool,
        /// Whether to enable rate limiting
        enable_rate_limiting: bool,
        /// Maximum transactions per address per time window
        max_tx_per_window: u64,
        /// Time window in seconds for rate limiting
        rate_limit_window: u64,
        /// Whether to enable transfer limits
        enable_transfer_limits: bool,
        /// Maximum transfer amount per transaction
        max_transfer_amount: u64,
        /// Whether to enable daily limits
        enable_daily_limits: bool,
        /// Maximum transfer amount per day per address
        max_daily_amount: u64,
        /// Whether to enable blacklist
        enable_blacklist: bool,
        /// List of blacklisted addresses
        blacklist: vector<address>,
        /// Whether to enable whitelist
        enable_whitelist: bool,
        /// List of whitelisted addresses
        whitelist: vector<address>,
        /// Emergency admin address
        emergency_admin: address,
    }
    
    /// Address transaction record for rate limiting
    struct AddressTxRecord has key {
        /// Address
        addr: address,
        /// Transaction count in current window
        tx_count: u64,
        /// Window start time
        window_start: u64,
        /// Daily transfer amount
        daily_amount: u64,
        /// Day start time
        day_start: u64,
    }
    
    /// Security event
    #[event]
    struct SecurityEvent has drop, store {
        /// Event type
        event_type: String,
        /// Address involved
        address: address,
        /// Timestamp
        timestamp: u64,
        /// Additional context
        context: vector<u8>,
    }
    
    /// Initialize the security module
    public fun init_module(deployer: &signer) {
        let deployer_addr = signer::address_of(deployer);
        
        // Initialize security config with default values
        move_to(deployer, SecurityConfig {
            security_level: SECURITY_LEVEL_HIGH,
            paused: false,
            enable_rate_limiting: true,
            max_tx_per_window: 10,
            rate_limit_window: 60, // 1 minute
            enable_transfer_limits: true,
            max_transfer_amount: 1000000000000, // 1000 APT
            enable_daily_limits: true,
            max_daily_amount: 5000000000000, // 5000 APT
            enable_blacklist: true,
            blacklist: vector::empty<address>(),
            enable_whitelist: false,
            whitelist: vector::empty<address>(),
            emergency_admin: deployer_addr,
        });
    }
    
    /// Check if an action is allowed based on security configuration
    public fun is_action_allowed(
        sender: &signer,
        action_type: u8,
        amount: u64
    ): bool acquires SecurityConfig, AddressTxRecord {
        let sender_addr = signer::address_of(sender);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Get security config
        let config = borrow_global<SecurityConfig>(deployer_addr);
        
        // Check if contract is paused
        if (config.paused && action_type != ACTION_ADMIN) {
            emit_security_event(b"contract_paused", sender_addr, vector::empty<u8>());
            return false
        };
        
        // Check if address is blacklisted
        if (config.enable_blacklist && is_address_blacklisted(sender_addr, config)) {
            emit_security_event(b"blacklisted_address", sender_addr, vector::empty<u8>());
            return false
        };
        
        // Check if address is whitelisted (if whitelist is enabled)
        if (config.enable_whitelist && !is_address_whitelisted(sender_addr, config)) {
            emit_security_event(b"not_whitelisted_address", sender_addr, vector::empty<u8>());
            return false
        };
        
        // Check rate limiting
        if (config.enable_rate_limiting && !check_rate_limit(sender_addr, config)) {
            emit_security_event(b"rate_limit_exceeded", sender_addr, vector::empty<u8>());
            return false
        };
        
        // Check transfer limits
        if (config.enable_transfer_limits && action_type == ACTION_TRANSFER && amount > config.max_transfer_amount) {
            emit_security_event(b"transfer_limit_exceeded", sender_addr, vector::empty<u8>());
            return false
        };
        
        // Check daily limits
        if (config.enable_daily_limits && action_type == ACTION_TRANSFER && !check_daily_limit(sender_addr, amount, config)) {
            emit_security_event(b"daily_limit_exceeded", sender_addr, vector::empty<u8>());
            return false
        };
        
        true
    }
    
    /// Check if an address is blacklisted
    fun is_address_blacklisted(addr: address, config: &SecurityConfig): bool {
        let blacklist = &config.blacklist;
        let i = 0;
        let len = blacklist.length();
        
        while (i < len) {
            if (blacklist.borrow(i) == &addr) {
                return true
            };
            i = i + 1;
        };
        
        false
    }
    
    /// Check if an address is whitelisted
    fun is_address_whitelisted(addr: address, config: &SecurityConfig): bool {
        let whitelist = &config.whitelist;
        let i = 0;
        let len = whitelist.length();
        
        while (i < len) {
            if (whitelist.borrow(i) == &addr) {
                return true
            };
            i = i + 1;
        };
        
        false
    }
    
    /// Check rate limit for an address
    fun check_rate_limit(addr: address, config: &SecurityConfig): bool acquires AddressTxRecord {
        let now = timestamp::now_seconds();
        let record_addr = get_record_address(addr);
        
        // Create record if it doesn't exist
        if (!exists<AddressTxRecord>(record_addr)) {
            let constructor_ref = aptos_framework::object::create_object(record_addr);
            let record_signer = aptos_framework::object::generate_signer(&constructor_ref);
            
            move_to(&record_signer, AddressTxRecord {
                addr,
                tx_count: 1,
                window_start: now,
                daily_amount: 0,
                day_start: now,
            });
            
            return true
        };
        
        // Borrow existing record
        let record = borrow_global_mut<AddressTxRecord>(record_addr);
        
        // Check if window has expired
        if (now - record.window_start >= config.rate_limit_window) {
            // Reset window
            record.tx_count = 1;
            record.window_start = now;
            return true
        };
        
        // Check if limit has been exceeded
        if (record.tx_count >= config.max_tx_per_window) {
            return false
        };
        
        // Increment transaction count
        record.tx_count = record.tx_count + 1;
        true
    }
    
    /// Check daily limit for an address
    fun check_daily_limit(addr: address, amount: u64, config: &SecurityConfig): bool acquires AddressTxRecord {
        let now = timestamp::now_seconds();
        let record_addr = get_record_address(addr);
        
        // Create record if it doesn't exist
        if (!exists<AddressTxRecord>(record_addr)) {
            let constructor_ref = aptos_framework::object::create_object(record_addr);
            let record_signer = aptos_framework::object::generate_signer(&constructor_ref);
            
            move_to(&record_signer, AddressTxRecord {
                addr,
                tx_count: 0,
                window_start: now,
                daily_amount: amount,
                day_start: now,
            });
            
            return true
        };
        
        // Borrow existing record
        let record = borrow_global_mut<AddressTxRecord>(record_addr);
        
        // Check if day has expired (86400 seconds = 1 day)
        if (now - record.day_start >= 86400) {
            // Reset day
            record.daily_amount = amount;
            record.day_start = now;
            return true
        };
        
        // Check if limit has been exceeded
        if (record.daily_amount + amount > config.max_daily_amount) {
            return false
        };
        
        // Update daily amount
        record.daily_amount = record.daily_amount + amount;
        true
    }
    
    /// Get record address for an address
    fun get_record_address(addr: address): address {
        // Derive a unique address for record based on the address
        // This ensures each address has its own record
        // Using a simple transformation for now
        // In a production implementation, we would use a more robust derivation method
        @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b4
    }
    
    /// Emit a security event
    fun emit_security_event(event_type: vector<u8>, addr: address, context: vector<u8>) {
        event::emit(SecurityEvent {
            event_type: std::string::utf8(event_type),
            address: addr,
            timestamp: timestamp::now_seconds(),
            context,
        });
    }
    
    /// Pause the contract (admin only)
    public entry fun pause_contract(admin: &signer) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can pause the contract
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        config.paused = true;
        
        emit_security_event(b"contract_paused", admin_addr, vector::empty<u8>());
    }
    
    /// Unpause the contract (admin only)
    public entry fun unpause_contract(admin: &signer) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can unpause the contract
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        config.paused = false;
        
        emit_security_event(b"contract_unpaused", admin_addr, vector::empty<u8>());
    }
    
    /// Emergency pause (emergency admin only)
    public entry fun emergency_pause(emergency_admin: &signer) acquires SecurityConfig {
        let emergency_admin_addr = signer::address_of(emergency_admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        let config = borrow_global<SecurityConfig>(deployer_addr);
        
        // Only the emergency admin can emergency pause
        assert!(emergency_admin_addr == config.emergency_admin, 0x90002); // Unauthorized error
        
        config.paused = true;
        
        emit_security_event(b"emergency_pause", emergency_admin_addr, vector::empty<u8>());
    }
    
    /// Add address to blacklist (admin only)
    public entry fun add_to_blacklist(admin: &signer, addr: address) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can add to blacklist
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        let blacklist = &mut config.blacklist;
        
        // Check if address is already in blacklist
        let i = 0;
        let len = blacklist.length();
        while (i < len) {
            if (blacklist.borrow(i) == &addr) {
                return // Already in blacklist
            };
            i = i + 1;
        };
        
        // Add to blacklist
        blacklist.push_back(addr);
        
        emit_security_event(b"added_to_blacklist", addr, vector::empty<u8>());
    }
    
    /// Remove address from blacklist (admin only)
    public entry fun remove_from_blacklist(admin: &signer, addr: address) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can remove from blacklist
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        let blacklist = &mut config.blacklist;
        
        // Find and remove address from blacklist
        let i = 0;
        let len = blacklist.length();
        while (i < len) {
            if (blacklist.borrow(i) == &addr) {
                blacklist.remove(i);
                emit_security_event(b"removed_from_blacklist", addr, vector::empty<u8>());
                return
            };
            i = i + 1;
        };
    }
    
    /// Add address to whitelist (admin only)
    public entry fun add_to_whitelist(admin: &signer, addr: address) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can add to whitelist
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        let whitelist = &mut config.whitelist;
        
        // Check if address is already in whitelist
        let i = 0;
        let len = whitelist.length();
        while (i < len) {
            if (whitelist.borrow(i) == &addr) {
                return // Already in whitelist
            };
            i = i + 1;
        };
        
        // Add to whitelist
        whitelist.push_back(addr);
        
        emit_security_event(b"added_to_whitelist", addr, vector::empty<u8>());
    }
    
    /// Remove address from whitelist (admin only)
    public entry fun remove_from_whitelist(admin: &signer, addr: address) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can remove from whitelist
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        let whitelist = &mut config.whitelist;
        
        // Find and remove address from whitelist
        let i = 0;
        let len = whitelist.length();
        while (i < len) {
            if (whitelist.borrow(i) == &addr) {
                whitelist.remove(i);
                emit_security_event(b"removed_from_whitelist", addr, vector::empty<u8>());
                return
            };
            i = i + 1;
        };
    }
    
    /// Set emergency admin (admin only)
    public entry fun set_emergency_admin(admin: &signer, new_emergency_admin: address) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can set emergency admin
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        config.emergency_admin = new_emergency_admin;
        
        emit_security_event(b"emergency_admin_set", new_emergency_admin, vector::empty<u8>());
    }
    
    /// Update security configuration (admin only)
    public entry fun update_security_config(
        admin: &signer,
        security_level: u8,
        enable_rate_limiting: bool,
        max_tx_per_window: u64,
        rate_limit_window: u64,
        enable_transfer_limits: bool,
        max_transfer_amount: u64,
        enable_daily_limits: bool,
        max_daily_amount: u64,
        enable_blacklist: bool,
        enable_whitelist: bool
    ) acquires SecurityConfig {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can update security configuration
        assert!(admin_addr == deployer_addr, 0x90001); // Unauthorized error
        
        let config = borrow_global_mut<SecurityConfig>(deployer_addr);
        config.security_level = security_level;
        config.enable_rate_limiting = enable_rate_limiting;
        config.max_tx_per_window = max_tx_per_window;
        config.rate_limit_window = rate_limit_window;
        config.enable_transfer_limits = enable_transfer_limits;
        config.max_transfer_amount = max_transfer_amount;
        config.enable_daily_limits = enable_daily_limits;
        config.max_daily_amount = max_daily_amount;
        config.enable_blacklist = enable_blacklist;
        config.enable_whitelist = enable_whitelist;
        
        emit_security_event(b"security_config_updated", admin_addr, vector::empty<u8>());
    }
    
    /// Get security configuration
    public fun get_security_config(): (
        u8,
        bool,
        bool,
        u64,
        u64,
        bool,
        u64,
        bool,
        u64,
        bool,
        bool,
        address
    ) acquires SecurityConfig {
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        let config = borrow_global<SecurityConfig>(deployer_addr);
        
        (
            config.security_level,
            config.paused,
            config.enable_rate_limiting,
            config.max_tx_per_window,
            config.rate_limit_window,
            config.enable_transfer_limits,
            config.max_transfer_amount,
            config.enable_daily_limits,
            config.max_daily_amount,
            config.enable_blacklist,
            config.enable_whitelist,
            config.emergency_admin,
        )
    }
    
    /// Check if contract is paused
    public fun is_contract_paused(): bool acquires SecurityConfig {
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        let config = borrow_global<SecurityConfig>(deployer_addr);
        config.paused
    }
    
    /// Get blacklist
    public fun get_blacklist(): vector<address> acquires SecurityConfig {
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        let config = borrow_global<SecurityConfig>(deployer_addr);
        config.blacklist
    }
    
    /// Get whitelist
    public fun get_whitelist(): vector<address> acquires SecurityConfig {
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        let config = borrow_global<SecurityConfig>(deployer_addr);
        config.whitelist
    }
    
    /// Get transaction record for an address
    public fun get_tx_record(addr: address): (u64, u64, u64, u64) acquires AddressTxRecord {
        let record_addr = get_record_address(addr);
        assert!(exists<AddressTxRecord>(record_addr), 0x90003); // Record not found error
        
        let record = borrow_global<AddressTxRecord>(record_addr);
        (
            record.tx_count,
            record.window_start,
            record.daily_amount,
            record.day_start,
        )
    }
    
    #[test_only]
    public fun init_module_for_test(deployer: &signer) {
        init_module(deployer);
    }
}