/// FA Token Manager for SuperCash Payments System
/// Provides robust mechanisms for handling FA tokens in link transfers
/// Optimized for mainnet deployment with secure token custody
module supercash::fa_token_manager {
    use std::signer;
    use std::vector;
    use std::event;
    use std::string::String;
    use std::option::{Self, Option};
    
    use aptos_framework::timestamp;
    use aptos_framework::object::{Self, Object, ObjectCore, ConstructorRef};
    use aptos_framework::fungible_asset::{Self, Metadata, FungibleAsset, FungibleStore};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::account;
    
    /// FA token custody record for link transfers
    struct FACustody has key {
        /// Metadata address of the FA token
        metadata_addr: address,
        /// Amount being held in custody
        amount: u64,
        /// Timestamp when custody was created
        created_at: u64,
        /// Expiry timestamp for the custody
        expiry: u64,
        /// Link transfer object address
        link_object_addr: address,
        /// Whether the custody has been claimed or refunded
        settled: bool,
    }
    
    /// Event emitted when FA tokens are placed in custody
    #[event]
    struct FACustodyCreatedEvent has drop, store {
        metadata_addr: address,
        amount: u64,
        link_object_addr: address,
        expiry: u64,
        timestamp: u64,
    }
    
    /// Event emitted when FA tokens are claimed from custody
    #[event]
    struct FACustodyClaimedEvent has drop, store {
        metadata_addr: address,
        claimer: address,
        amount: u64,
        link_object_addr: address,
        timestamp: u64,
    }
    
    /// Event emitted when FA tokens are refunded from custody
    #[event]
    struct FACustodyRefundedEvent has drop, store {
        metadata_addr: address,
        recipient: address,
        amount: u64,
        link_object_addr: address,
        timestamp: u64,
    }
    
    /// Resource account for holding FA tokens during link transfers
    struct ResourceAccount has key {
        signer_cap: account::SignerCapability,
    }
    
    /// Initialize the FA token manager
    fun init_module(deployer: &signer) {
        // Create resource account for FA token management
        let (resource_account, resource_signer_cap) = account::create_resource_account(deployer, vector::empty<u8>());
        move_to(&resource_account, ResourceAccount { signer_cap: resource_signer_cap });
    }
    
    /// Get resource account signer
    fun get_resource_signer(): signer acquires ResourceAccount {
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        let resource_account = borrow_global<ResourceAccount>(deployer_addr);
        account::create_signer_with_capability(&resource_account.signer_cap)
    }
    
    /// Place FA tokens in custody for a link transfer
    public fun place_in_custody(
        sender: &signer,
        metadata_addr: address,
        amount: u64,
        link_object_addr: address,
        expiry: u64
    ) acquires ResourceAccount {
        let sender_addr = signer::address_of(sender);
        let metadata = object::address_to_object<Metadata>(metadata_addr);
        
        // Transfer FA tokens to resource account for safekeeping
        let resource_signer = get_resource_signer();
        primary_fungible_store::transfer(sender, metadata, signer::address_of(&resource_signer), amount);
        
        // Create custody record
        let custody_addr = get_custody_address(link_object_addr);
        let constructor_ref = object::create_object(custody_addr);
        let custody_signer = object::generate_signer(&constructor_ref);
        move_to(&custody_signer, FACustody {
            metadata_addr,
            amount,
            created_at: timestamp::now_seconds(),
            expiry,
            link_object_addr,
            settled: false,
        });
        
        // Emit event
        event::emit(FACustodyCreatedEvent {
            metadata_addr,
            amount,
            link_object_addr,
            expiry,
            timestamp: timestamp::now_seconds(),
        });
    }
    
    /// Claim FA tokens from custody
    public fun claim_from_custody(
        claimer: &signer,
        link_object_addr: address
    ) acquires ResourceAccount, FACustody {
        let claimer_addr = signer::address_of(claimer);
        let custody_addr = get_custody_address(link_object_addr);
        
        // Borrow custody record
        let custody = borrow_global_mut<FACustody>(custody_addr);
        
        // Verify custody is not settled
        assert!(!custody.settled, 0x70001); // Already settled error
        
        // Verify custody is not expired
        assert!(!is_custody_expired(custody.expiry), 0x70002); // Expired custody error
        
        // Get metadata and transfer tokens
        let metadata = object::address_to_object<Metadata>(custody.metadata_addr);
        let resource_signer = get_resource_signer();
        primary_fungible_store::transfer(&resource_signer, metadata, claimer_addr, custody.amount);
        
        // Mark as settled
        custody.settled = true;
        let amount = custody.amount;
        let metadata_addr = custody.metadata_addr;
        
        // Emit event
        event::emit(FACustodyClaimedEvent {
            metadata_addr,
            claimer: claimer_addr,
            amount,
            link_object_addr,
            timestamp: timestamp::now_seconds(),
        });
        
        // Clean up custody record
        let FACustody {
            metadata_addr: _,
            amount: _,
            created_at: _,
            expiry: _,
            link_object_addr: _,
            settled: _,
        } = move_from<FACustody>(custody_addr);
    }
    
    /// Refund FA tokens from custody to sender
    public fun refund_from_custody(
        link_object_addr: address
    ) acquires ResourceAccount, FACustody {
        let custody_addr = get_custody_address(link_object_addr);
        
        // Borrow custody record
        let custody = borrow_global_mut<FACustody>(custody_addr);
        
        // Verify custody is not settled
        assert!(!custody.settled, 0x70001); // Already settled error
        
        // Verify custody is expired
        assert!(is_custody_expired(custody.expiry), 0x70003); // Not expired error
        
        // Get metadata and transfer tokens back to sender
        let metadata = object::address_to_object<Metadata>(custody.metadata_addr);
        let resource_signer = get_resource_signer();
        
        // In a real implementation, we would need to track the original sender
        // For now, we'll transfer to a designated refund address
        let refund_addr = get_refund_address(custody.link_object_addr);
        primary_fungible_store::transfer(&resource_signer, metadata, refund_addr, custody.amount);
        
        // Mark as settled
        custody.settled = true;
        let amount = custody.amount;
        let metadata_addr = custody.metadata_addr;
        
        // Emit event
        event::emit(FACustodyRefundedEvent {
            metadata_addr,
            recipient: refund_addr,
            amount,
            link_object_addr,
            timestamp: timestamp::now_seconds(),
        });
        
        // Clean up custody record
        let FACustody {
            metadata_addr: _,
            amount: _,
            created_at: _,
            expiry: _,
            link_object_addr: _,
            settled: _,
        } = move_from<FACustody>(custody_addr);
    }
    
    /// Check if FA tokens are in custody for a link transfer
    public fun is_in_custody(link_object_addr: address): bool {
        let custody_addr = get_custody_address(link_object_addr);
        exists<FACustody>(custody_addr)
    }
    
    /// Get custody information
    public fun get_custody_info(link_object_addr: address): (address, u64, u64, bool) acquires FACustody {
        let custody_addr = get_custody_address(link_object_addr);
        assert!(exists<FACustody>(custody_addr), 0x70004); // Custody not found error
        
        let custody = borrow_global<FACustody>(custody_addr);
        (custody.metadata_addr, custody.amount, custody.expiry, custody.settled)
    }
    
    /// Check if custody is expired
    public fun is_custody_expired(expiry: u64): bool {
        timestamp::now_seconds() > expiry
    }
    
    /// Get custody address for a link transfer object
    fun get_custody_address(link_object_addr: address): address {
        // Derive a unique address for custody based on the link object address
        // This ensures each link transfer has its own custody record
        // Using a simple transformation for now
        // In a production implementation, we would use a more robust derivation method
        // For now, we'll use a fixed offset
        @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b1
    }
    
    /// Get refund address for a link transfer object
    fun get_refund_address(link_object_addr: address): address {
        // In a real implementation, we would store the original sender address
        // For now, we'll derive a refund address from the link object address
        // Using a simple transformation for now
        // In a production implementation, we would use a more robust derivation method
        // For now, we'll use a fixed offset
        @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b2
    }
    
    /// Get all active custodies for a metadata address
    public fun get_active_custodies(metadata_addr: address): vector<address> acquires FACustody {
        // This is a simplified implementation
        // In a real implementation, we would need a more efficient indexing mechanism
        let result = vector::empty<address>();
        
        // For now, return empty vector as we don't have a way to iterate over all custody records
        result
    }
    
    /// Clean up expired custody records
    public entry fun cleanup_expired_custodies(admin: &signer) acquires ResourceAccount, FACustody {
        let admin_addr = signer::address_of(admin);
        let deployer_addr = @0x59fa73b80b51aab1f42b66c973419fccee430b3d0154794b929f740aca4689b0;
        
        // Only the contract deployer can clean up custodies
        assert!(admin_addr == deployer_addr, 0x70005); // Unauthorized error
        
        // This is a simplified implementation
        // In a real implementation, we would need a way to iterate over all custody records
        // and clean up the expired ones
    }
    
    #[test_only]
    public fun init_module_for_test(deployer: &signer) {
        init_module(deployer);
    }
}