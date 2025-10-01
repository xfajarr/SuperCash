/// Error codes for the SuperCash payments system
/// Optimized for efficient error handling with minimal gas overhead
module supercash::errors {
    // === Direct Transfer Errors ===
    /// Insufficient balance for the transfer
    const E_INSUFFICIENT_BALANCE: u64 = 1001;
    
    /// Invalid transfer amount (zero or negative)
    const E_INVALID_AMOUNT: u64 = 1002;
    
    /// Self transfer not allowed
    const E_SELF_TRANSFER: u64 = 1003;
    
    /// Vault not initialized for user
    const E_VAULT_NOT_INITIALIZED: u64 = 1004;
    
    // === Link Transfer Errors ===
    /// Invalid commitment hash format
    const E_INVALID_COMMITMENT: u64 = 2001;
    
    /// Link transfer has expired
    const E_LINK_EXPIRED: u64 = 2002;
    
    /// Link transfer already claimed
    const E_ALREADY_CLAIMED: u64 = 2003;
    
    /// Invalid secret provided for claim
    const E_INVALID_SECRET: u64 = 2004;
    
    /// Link transfer not found
    const E_LINK_NOT_FOUND: u64 = 2005;
    
    /// Only sender can refund expired link
    const E_NOT_SENDER: u64 = 2006;
    
    /// Link not yet expired, cannot refund
    const E_NOT_EXPIRED: u64 = 2007;
    
    // === System Errors ===
    /// Contract is paused
    const E_CONTRACT_PAUSED: u64 = 3001;
    
    /// Unauthorized access
    const E_UNAUTHORIZED: u64 = 3002;
    
    /// Invalid nonce for replay protection
    const E_INVALID_NONCE: u64 = 3003;
    
    /// Resource already exists
    const E_ALREADY_EXISTS: u64 = 3004;
    
    /// Functionality not yet implemented
    const E_NOT_IMPLEMENTED: u64 = 3005;
    
    // === Getter Functions ===
    
    public fun insufficient_balance(): u64 { E_INSUFFICIENT_BALANCE }
    public fun invalid_amount(): u64 { E_INVALID_AMOUNT }
    public fun self_transfer(): u64 { E_SELF_TRANSFER }
    public fun vault_not_initialized(): u64 { E_VAULT_NOT_INITIALIZED }
    
    public fun invalid_commitment(): u64 { E_INVALID_COMMITMENT }
    public fun link_expired(): u64 { E_LINK_EXPIRED }
    public fun already_claimed(): u64 { E_ALREADY_CLAIMED }
    public fun invalid_secret(): u64 { E_INVALID_SECRET }
    public fun link_not_found(): u64 { E_LINK_NOT_FOUND }
    public fun not_sender(): u64 { E_NOT_SENDER }
    public fun not_expired(): u64 { E_NOT_EXPIRED }
    
    public fun contract_paused(): u64 { E_CONTRACT_PAUSED }
    public fun unauthorized(): u64 { E_UNAUTHORIZED }
    public fun invalid_nonce(): u64 { E_INVALID_NONCE }
    public fun already_exists(): u64 { E_ALREADY_EXISTS }
    public fun not_implemented(): u64 { E_NOT_IMPLEMENTED }
}