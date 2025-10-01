
#[test_only]
module supercash::payments_tests {
    use std::signer;
    use std::vector;
    use std::string::String;
    use aptos_framework::account;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::timestamp;
    use aptos_framework::object;
    use aptos_std::aptos_hash;
    
    use supercash::payments;
    use supercash::errors;
    use supercash::utils;
    use supercash::coin_handler;
    use supercash::optimizer;
    use supercash::fa_token_manager;
    use supercash::error_handler;
    use supercash::security;
    
    // Test helpers
    const ONE_APT: u64 = 100000000; // 1 APT in octas
    const MIN_AMOUNT: u64 = 1000000; // 0.01 APT
    
    fun setup_test_env(): (signer, address, signer, address) {
        // Initialize timestamp for testing
        timestamp::set_time_has_started_for_testing(&account::create_signer_for_test(@0x1));
        
        // Create test accounts
        let deployer = account::create_signer_for_test(@supercash);
        let deployer_addr = signer::address_of(&deployer);
        
        let alice = account::create_signer_for_test(@0x100);
        let alice_addr = signer::address_of(&alice);
        
        // Initialize AptosCoin for testing
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&deployer);
        
        // Mint some coins to alice
        let coins = coin::mint<AptosCoin>(10 * ONE_APT, &mint_cap);
        coin::deposit(alice_addr, coins);
        
        // Clean up capabilities
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
        
        // Initialize the payments system
        payments::init_module_for_test(&deployer);
        
        // Initialize other modules
        coin_handler::init_module_for_test(&deployer);
        optimizer::init_module_for_test(&deployer);
        fa_token_manager::init_module_for_test(&deployer);
        error_handler::init_module_for_test(&deployer);
        security::init_module_for_test(&deployer);
        
        (deployer, deployer_addr, alice, alice_addr)
    }
    
    fun setup_two_users(): (signer, address, signer, address, signer, address) {
        let (deployer, deployer_addr, alice, alice_addr) = setup_test_env();
        
        let bob = account::create_signer_for_test(@0x200);
        let bob_addr = signer::address_of(&bob);
        
        // Mint some coins to bob
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&deployer);
        let coins = coin::mint<AptosCoin>(10 * ONE_APT, &mint_cap);
        coin::deposit(bob_addr, coins);
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
        
        (deployer, deployer_addr, alice, alice_addr, bob, bob_addr)
    }
    
    // === DIRECT TRANSFER TESTS ===
    
    #[test]
    fun test_direct_transfer() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Direct transfer
        payments::direct_transfer(&alice, bob_addr, 0, 2 * ONE_APT);
        
        // Check balances
        assert!(coin::balance<AptosCoin>(alice_addr) == 8 * ONE_APT, 1);
        assert!(coin::balance<AptosCoin>(bob_addr) == 12 * ONE_APT, 2);
    }
    
    #[test]
    #[expected_failure(abort_code = 1002)]
    fun test_zero_amount_transfer_fails() {
        let (_, _, alice, _, bob, bob_addr) = setup_two_users();
        
        payments::direct_transfer(&alice, bob_addr, 0, 0); // Should fail
    }
    
    #[test]
    #[expected_failure(abort_code = 1003)]
    fun test_self_transfer_fails() {
        let (_, _, alice, alice_addr) = setup_test_env();
        
        payments::direct_transfer(&alice, alice_addr, 0, ONE_APT); // Should fail
    }
    
    #[test]
    fun test_batch_direct_transfer() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        let charlie = account::create_signer_for_test(@0x300);
        let charlie_addr = signer::address_of(&charlie);
        
        // Mint coins to charlie
        let (burn_cap, mint_cap) = aptos_coin::initialize_for_test(&account::create_signer_for_test(@supercash));
        let coins = coin::mint<AptosCoin>(10 * ONE_APT, &mint_cap);
        coin::deposit(charlie_addr, coins);
        coin::destroy_burn_cap(burn_cap);
        coin::destroy_mint_cap(mint_cap);
        
        // Batch transfer
        let recipients = vector::empty<address>();
        recipients.push_back(bob_addr);
        recipients.push_back(charlie_addr);
        
        let amounts = vector::empty<u64>();
        amounts.push_back(2 * ONE_APT);
        amounts.push_back(3 * ONE_APT);
        
        payments::batch_direct_transfer(&alice, recipients, amounts, 0);
        
        // Check balances
        assert!(coin::balance<AptosCoin>(alice_addr) == 5 * ONE_APT, 1);
        assert!(coin::balance<AptosCoin>(bob_addr) == 12 * ONE_APT, 2);
        assert!(coin::balance<AptosCoin>(charlie_addr) == 13 * ONE_APT, 3);
    }
    
    // === LINK TRANSFER TESTS ===
    
    #[test]
    fun test_create_and_claim_link_transfer() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Create link transfer
        let secret = vector::empty<u8>();
        let i = 0;
        while (i < 32) {
            secret.push_back(((i + 1) as u8));
            i += 1;
        };
        
        let amount = 2 * ONE_APT;
        let expiry = timestamp::now_seconds() + 3600; // 1 hour from now
        let nonce = utils::generate_nonce(alice_addr, secret);
        let commitment = utils::create_commitment(secret, amount, nonce, expiry, alice_addr);
        
        payments::transfer_with_link(&alice, 0, commitment, amount, expiry);
        
        // Check alice's balance reduced
        assert!(coin::balance<AptosCoin>(alice_addr) == 8 * ONE_APT, 1);
        
        // Get the object address (simplified for testing)
        let constructor_ref = object::create_object(alice_addr);
        let object_address = object::address_from_constructor_ref(&constructor_ref);
        
        // Claim the transfer
        payments::claim_transfer_link(&bob, secret, amount, nonce, expiry, alice_addr, object_address);
        
        // Check balances
        assert!(coin::balance<AptosCoin>(bob_addr) == 12 * ONE_APT, 2);
    }
    
    #[test]
    fun test_create_link_with_commitment_verification() {
        let (_, _, alice, alice_addr) = setup_test_env();
        
        // Create proper commitment
        let secret = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let amount = 2 * ONE_APT;
        let expiry = timestamp::now_seconds() + 3600;
        let nonce = utils::generate_nonce(alice_addr, secret);
        let commitment = utils::create_commitment(secret, amount, nonce, expiry, alice_addr);
        
        payments::transfer_with_link(&alice, 0, commitment, amount, expiry);
        
        // Verify commitment can be verified
        assert!(utils::verify_commitment(commitment, secret, amount, nonce, expiry, alice_addr), 1);
        
        // Verify wrong secret fails
        let wrong_secret = x"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
        assert!(!utils::verify_commitment(commitment, wrong_secret, amount, nonce, expiry, alice_addr), 2);
    }
    
    #[test]
    #[expected_failure(abort_code = 2001)]
    fun test_create_link_with_invalid_commitment_fails() {
        let (_, _, alice, _) = setup_test_env();
        
        // Invalid commitment (wrong length)
        let invalid_commitment = x"1234";
        let expiry = timestamp::now_seconds() + 3600;
        
        payments::transfer_with_link(&alice, 0, invalid_commitment, MIN_AMOUNT, expiry); // Should fail
    }
    
    #[test]
    #[expected_failure(abort_code = 2002)]
    fun test_create_link_with_past_expiry_fails() {
        let (_, _, alice, alice_addr) = setup_test_env();
        
        let secret = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let amount = MIN_AMOUNT;
        let expiry = timestamp::now_seconds() - 1; // Past expiry
        let commitment = utils::create_commitment(secret, amount, 0, expiry, alice_addr);
        
        payments::transfer_with_link(&alice, 0, commitment, amount, expiry); // Should fail
    }
    
    #[test]
    fun test_refund_expired_link() {
        let (_, _, alice, alice_addr) = setup_test_env();
        
        let secret = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let amount = 2 * ONE_APT;
        let expiry = timestamp::now_seconds() + 10; // Short expiry
        let nonce = utils::generate_nonce(alice_addr, secret);
        let commitment = utils::create_commitment(secret, amount, nonce, expiry, alice_addr);
        
        payments::transfer_with_link(&alice, 0, commitment, amount, expiry);
        
        // Fast forward time to expire the link
        timestamp::fast_forward_seconds(20);
        
        // Get object address for refund (this would be tracked off-chain in practice)
        let constructor_ref = object::create_object(alice_addr);
        let object_address = object::address_from_constructor_ref(&constructor_ref);
        
        // Refund expired link
        payments::refund_expired_link(&alice, object_address);
        
        // Check balance restored
        assert!(coin::balance<AptosCoin>(alice_addr) == 10 * ONE_APT, 1);
    }
    
    // === SYSTEM STATS TESTS ===
    
    #[test]
    fun test_system_statistics() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Perform some transfers
        payments::direct_transfer(&alice, bob_addr, 0, 2 * ONE_APT);
        payments::direct_transfer(&alice, bob_addr, 0, 3 * ONE_APT);
        
        let (direct_transfers, link_transfers, claims, token_volumes) = payments::get_system_stats();
        
        assert!(direct_transfers == 2, 1);
        assert!(link_transfers == 0, 2);
        assert!(claims == 0, 3);
        assert!(token_volumes[0] == 5 * ONE_APT, 4);
    }
    
    // === UTILITY FUNCTION TESTS ===
    
    #[test]
    fun test_utils_u64_to_bytes() {
        let value: u64 = 0x123456789ABCDEF0;
        let bytes = utils::u64_to_bytes(value);
        
        assert!(bytes.length() == 8, 1);
        assert!(bytes[0] == 0xF0, 2);
        assert!(bytes[7] == 0x12, 3);
    }
    
    #[test]
    fun test_utils_address_to_bytes() {
        let addr = @0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF;
        let bytes = utils::address_to_bytes(addr);
        
        assert!(bytes.length() == 32, 1);
    }
    
    #[test]
    fun test_commitment_deterministic() {
        let secret = x"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
        let amount = 1000000u64;
        let nonce = 12345u64;
        let expiry = 1234567890u64;
        let sender = @0x100;
        
        let commitment1 = utils::create_commitment(secret, amount, nonce, expiry, sender);
        let commitment2 = utils::create_commitment(secret, amount, nonce, expiry, sender);
        
        assert!(commitment1 == commitment2, 1);
        
        // Different inputs should produce different commitments
        let commitment3 = utils::create_commitment(secret, amount + 1, nonce, expiry, sender);
        assert!(commitment1 != commitment3, 2);
    }
    
    #[test]
    fun test_batch_hash_operations() {
        let items = vector::empty<vector<u8>>();
        items.push_back(x"123456");
        items.push_back(x"abcdef");
        
        let results = utils::batch_hash(items);
        
        assert!(results.length() == 2, 1);
        
        // Each result should be 32 bytes (SHA3-256)
        assert!(results.borrow(0).length() == 32, 2);
        assert!(results.borrow(1).length() == 32, 3);
    }
    
    // === ADMIN TESTS ===
    
    #[test]
    fun test_pause_unpause() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Pause the contract
        payments::set_paused(&deployer, true);
        
        // Try to transfer (should fail when paused)
        // Note: This would need a try-catch mechanism to test properly
        // For now, we just test the pause/unpause functionality
        
        // Unpause
        payments::set_paused(&deployer, false);
        
        // Now transfer should work
        payments::direct_transfer(&alice, bob_addr, 0, MIN_AMOUNT);
        assert!(coin::balance<AptosCoin>(bob_addr) == 10 * ONE_APT + MIN_AMOUNT, 1);
    }
    
    #[test]
    #[expected_failure(abort_code = 3002)]
    fun test_unauthorized_pause_fails() {
        let (_, _, alice, _) = setup_test_env();
        
        // Alice tries to pause (should fail)
        payments::set_paused(&alice, true);
    }
    
    #[test]
    fun test_add_fa_token() {
        let (deployer, _, _, _) = setup_test_env();
        
        // Add a new FA token
        let name = std::string::utf8(b"Test Token");
        let symbol = std::string::utf8(b"TST");
        let decimals = 6;
        let metadata_addr = @0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        
        payments::add_fa_token(&deployer, name, symbol, decimals, metadata_addr);
        
        // Check token was added
        let supported_tokens = payments::get_supported_tokens();
        assert!(supported_tokens.length() == 2, 1); // APT + new token
        assert!(supported_tokens[0] == 0, 2); // APT index
        assert!(supported_tokens[1] == 1, 3); // New token index
        
        // Get token info
        let (token_name, token_symbol, token_decimals, is_coin, is_active) = payments::get_token_info(1);
        assert!(token_name == name, 2);
        assert!(token_symbol == symbol, 3);
        assert!(token_decimals == decimals, 4);
        assert!(is_coin == false, 5);
        assert!(is_active == true, 6);
    }
    
    // === COIN HANDLER TESTS ===
    
    #[test]
    fun test_coin_handler_register_coin() {
        let (deployer, _, _, _) = setup_test_env();
        
        // Register a new coin type
        let type_name = std::string::utf8(b"0x1::test_coin::TestCoin");
        let module_address = @0x1;
        let module_name = std::string::utf8(b"test_coin");
        let struct_name = std::string::utf8(b"TestCoin");
        let decimals = 8;
        
        coin_handler::register_coin(&deployer, type_name, module_address, module_name, struct_name, decimals);
        
        // Check coin was registered
        let registered_coins = coin_handler::get_registered_coins();
        assert!(registered_coins.length() == 2, 1); // APT + new coin
        
        // Get coin info
        let (addr, mod_name, struct_name_ret, dec, is_active) = coin_handler::get_coin_info(type_name);
        assert!(addr == module_address, 2);
        assert!(mod_name == module_name, 3);
        assert!(struct_name_ret == struct_name, 4);
        assert!(dec == decimals, 5);
        assert!(is_active == true, 6);
    }
    
    #[test]
    fun test_coin_handler_set_coin_active() {
        let (deployer, _, _, _) = setup_test_env();
        
        // Register a new coin type
        let type_name = std::string::utf8(b"0x1::test_coin::TestCoin");
        let module_address = @0x1;
        let module_name = std::string::utf8(b"test_coin");
        let struct_name = std::string::utf8(b"TestCoin");
        let decimals = 8;
        
        coin_handler::register_coin(&deployer, type_name, module_address, module_name, struct_name, decimals);
        
        // Deactivate coin
        coin_handler::set_coin_active(&deployer, type_name, false);
        
        // Check coin is inactive
        let (_, _, _, _, is_active) = coin_handler::get_coin_info(type_name);
        assert!(is_active == false, 1);
        
        // Reactivate coin
        coin_handler::set_coin_active(&deployer, type_name, true);
        
        // Check coin is active
        let (_, _, _, _, is_active) = coin_handler::get_coin_info(type_name);
        assert!(is_active == true, 2);
    }
    
    #[test]
    fun test_coin_handler_is_coin_supported() {
        let (deployer, _, _, _) = setup_test_env();
        
        // Check APT is supported
        let apt_type_name = std::string::utf8(b"0x1::aptos_coin::AptosCoin");
        assert!(coin_handler::is_coin_supported(apt_type_name), 1);
        
        // Check unsupported coin
        let unsupported_type_name = std::string::utf8(b"0x1::unsupported_coin::UnsupportedCoin");
        assert!(!coin_handler::is_coin_supported(unsupported_type_name), 2);
    }
    
    #[test]
    fun test_coin_handler_transfer_aptos_coin() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Transfer AptosCoin using coin handler
        coin_handler::transfer_aptos_coin(&alice, bob_addr, 2 * ONE_APT);
        
        // Check balances
        assert!(coin::balance<AptosCoin>(alice_addr) == 8 * ONE_APT, 1);
        assert!(coin::balance<AptosCoin>(bob_addr) == 12 * ONE_APT, 2);
    }
    
    // === OPTIMIZER TESTS ===
    
    #[test]
    fun test_optimizer_start_end_timing() {
        let (_, _, alice, _, _, _) = setup_test_env();
        
        let start_time = optimizer::start_timing();
        timestamp::fast_forward_seconds(1);
        let duration = optimizer::end_timing(start_time, std::string::utf8(b"test_operation"));
        
        // Check duration is approximately 1000ms (1 second)
        assert!(duration >= 900 && duration <= 1100, 1);
    }
    
    #[test]
    fun test_optimizer_calculate_optimal_batch_size() {
        let (_, _, _, _, _, _) = setup_test_env();
        
        // Test with base time of 100ms per item, 50ms overhead, max batch 10, target 500ms
        let optimal_size = optimizer::calculate_optimal_batch_size(100, 50, 10, 500);
        
        // Expected: (500 - 50) / 100 = 4.5 -> 4
        assert!(optimal_size == 4, 1);
    }
    
    #[test]
    fun test_optimizer_estimate_batch_time() {
        let (_, _, _, _, _, _) = setup_test_env();
        
        // Test with 5 items, 100ms per item, 50ms overhead
        let estimated_time = optimizer::estimate_batch_time(5, 100, 50);
        
        // Expected: 5 * 100 + 50 = 550ms
        assert!(estimated_time == 550, 1);
    }
    
    #[test]
    fun test_optimizer_is_tx_time_acceptable() {
        let (_, _, _, _, _, _) = setup_test_env();
        
        // Test with default config (max 1000ms)
        assert!(optimizer::is_tx_time_acceptable(500), 1); // Should be acceptable
        assert!(!optimizer::is_tx_time_acceptable(1500), 2); // Should not be acceptable
    }
    
    #[test]
    fun test_optimizer_is_tx_time_within_target() {
        let (_, _, _, _, _, _) = setup_test_env();
        
        // Test with default config (target 500ms)
        assert!(optimizer::is_tx_time_within_target(400), 1); // Should be within target
        assert!(!optimizer::is_tx_time_within_target(600), 2); // Should not be within target
    }
    
    #[test]
    fun test_optimizer_update_config() {
        let (deployer, _, _, _, _, _) = setup_test_env();
        
        // Update config
        optimizer::update_config(&deployer, 300, 800, 500, false);
        
        // Check config was updated
        let (target, max, warning, emit_events) = optimizer::get_config();
        assert!(target == 300, 1);
        assert!(max == 800, 2);
        assert!(warning == 500, 3);
        assert!(emit_events == false, 4);
    }
    
    // === FA TOKEN MANAGER TESTS ===
    
    #[test]
    fun test_fa_token_manager_place_in_custody() {
        let (deployer, _, alice, alice_addr, _, _) = setup_two_users();
        
        // Create a mock metadata address
        let metadata_addr = @0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        let link_object_addr = @0x200;
        let expiry = timestamp::now_seconds() + 3600;
        
        // Place tokens in custody
        fa_token_manager::place_in_custody(&alice, metadata_addr, 2 * ONE_APT, link_object_addr, expiry);
        
        // Check tokens are in custody
        assert!(fa_token_manager::is_in_custody(link_object_addr), 1);
        
        // Get custody info
        let (custody_metadata_addr, amount, custody_expiry, settled) = fa_token_manager::get_custody_info(link_object_addr);
        assert!(custody_metadata_addr == metadata_addr, 2);
        assert!(amount == 2 * ONE_APT, 3);
        assert!(custody_expiry == expiry, 4);
        assert!(settled == false, 5);
    }
    
    #[test]
    fun test_fa_token_manager_claim_from_custody() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Create a mock metadata address
        let metadata_addr = @0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        let link_object_addr = @0x200;
        let expiry = timestamp::now_seconds() + 3600;
        
        // Place tokens in custody
        fa_token_manager::place_in_custody(&alice, metadata_addr, 2 * ONE_APT, link_object_addr, expiry);
        
        // Claim tokens from custody
        fa_token_manager::claim_from_custody(&bob, link_object_addr);
        
        // Check tokens are no longer in custody
        assert!(!fa_token_manager::is_in_custody(link_object_addr), 1);
    }
    
    #[test]
    fun test_fa_token_manager_refund_from_custody() {
        let (deployer, _, alice, alice_addr, _, _) = setup_two_users();
        
        // Create a mock metadata address
        let metadata_addr = @0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        let link_object_addr = @0x200;
        let expiry = timestamp::now_seconds() + 10; // Short expiry
        
        // Place tokens in custody
        fa_token_manager::place_in_custody(&alice, metadata_addr, 2 * ONE_APT, link_object_addr, expiry);
        
        // Fast forward time to expire the custody
        timestamp::fast_forward_seconds(20);
        
        // Refund tokens from custody
        fa_token_manager::refund_from_custody(link_object_addr);
        
        // Check tokens are no longer in custody
        assert!(!fa_token_manager::is_in_custody(link_object_addr), 1);
    }
    
    #[test]
    fun test_fa_token_manager_is_custody_expired() {
        let (_, _, _, _, _, _) = setup_test_env();
        
        let now = timestamp::now_seconds();
        
        // Test with expired custody
        assert!(fa_token_manager::is_custody_expired(now - 1), 1);
        
        // Test with non-expired custody
        assert!(!fa_token_manager::is_custody_expired(now + 3600), 2);
    }
    
    // === ERROR HANDLER TESTS ===
    
    #[test]
    fun test_error_handler_log_error() {
        let (_, _, alice, _, _, _) = setup_test_env();
        
        // Log a validation error
        let context = vector::empty<vector<u8>>();
        error_handler::handle_validation_error(
            &alice,
            1001,
            std::string::utf8(b"Test validation error"),
            context
        );
        
        // Check error stats were updated
        let (total_errors, errors_by_severity, errors_by_category, recovery_success_rate, _) = error_handler::get_error_stats();
        assert!(total_errors == 1, 1);
        assert!(errors_by_severity[2] == 1, 2); // Error severity
        assert!(errors_by_category[0] == 1, 3); // Validation category
        assert!(recovery_success_rate == 0, 4); // No recovery
    }
    
    #[test]
    fun test_error_handler_handle_execution_error_with_retry() {
        let (_, _, alice, _, _, _) = setup_test_env();
        
        // Handle execution error with retry
        let context = vector::empty<vector<u8>>();
        let (recovery_success, recovery_action) = error_handler::handle_execution_error_with_retry(
            &alice,
            2001,
            std::string::utf8(b"Test execution error"),
            context,
            0 // First retry
        );
        
        // Check recovery was attempted
        assert!(recovery_action == 1, 1); // RECOVERY_RETRY
        assert!(recovery_success == true, 2); // Should succeed on first retry
        
        // Check error stats were updated
        let (total_errors, errors_by_severity, errors_by_category, recovery_success_rate, _) = error_handler::get_error_stats();
        assert!(total_errors == 1, 3);
        assert!(errors_by_severity[2] == 1, 4); // Error severity
        assert!(errors_by_category[2] == 1, 5); // Execution category
        assert!(recovery_success_rate == 100, 6); // 100% success rate
    }
    
    #[test]
    fun test_error_handler_handle_resource_error_with_refund() {
        let (_, _, alice, _, _, _) = setup_test_env();
        
        // Handle resource error with refund
        let context = vector::empty<vector<u8>>();
        let (recovery_success, recovery_action) = error_handler::handle_resource_error_with_refund(
            &alice,
            3001,
            std::string::utf8(b"Test resource error"),
            context
        );
        
        // Check recovery was attempted
        assert!(recovery_action == 3, 1); // RECOVERY_REFUND
        assert!(recovery_success == true, 2); // Should succeed
        
        // Check error stats were updated
        let (total_errors, errors_by_severity, errors_by_category, recovery_success_rate, _) = error_handler::get_error_stats();
        assert!(total_errors == 1, 3);
        assert!(errors_by_severity[1] == 1, 4); // Warning severity
        assert!(errors_by_category[3] == 1, 5); // Resource category
        assert!(recovery_success_rate == 100, 6); // 100% success rate
    }
    
    #[test]
    fun test_error_handler_update_config() {
        let (deployer, _, _, _, _, _) = setup_test_env();
        
        // Update error config
        error_handler::update_error_config(&deployer, 5000, true, 5, true, true);
        
        // Check config was updated
        let (max_log_entries, auto_retry, max_retry_attempts, auto_refund, log_all_errors) = error_handler::get_error_config();
        assert!(max_log_entries == 5000, 1);
        assert!(auto_retry == true, 2);
        assert!(max_retry_attempts == 5, 3);
        assert!(auto_refund == true, 4);
        assert!(log_all_errors == true, 5);
    }
    
    // === SECURITY TESTS ===
    
    #[test]
    fun test_security_is_action_allowed() {
        let (_, _, alice, alice_addr, bob, bob_addr) = setup_test_env();
        
        // Test allowed action
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, 2 * ONE_APT), 1);
        
        // Perform transfer
        payments::direct_transfer(&alice, bob_addr, 0, 2 * ONE_APT);
        
        // Check balances
        assert!(coin::balance<AptosCoin>(alice_addr) == 8 * ONE_APT, 2);
        assert!(coin::balance<AptosCoin>(bob_addr) == 12 * ONE_APT, 3);
    }
    
    #[test]
    fun test_security_pause_unpause() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Pause the contract
        security::pause_contract(&deployer);
        
        // Check contract is paused
        assert!(security::is_contract_paused(), 1);
        
        // Try to transfer (should fail when paused)
        // Note: This would need a try-catch mechanism to test properly
        
        // Unpause the contract
        security::unpause_contract(&deployer);
        
        // Check contract is not paused
        assert!(!security::is_contract_paused(), 2);
        
        // Now transfer should work
        payments::direct_transfer(&alice, bob_addr, 0, MIN_AMOUNT);
        assert!(coin::balance<AptosCoin>(bob_addr) == 10 * ONE_APT + MIN_AMOUNT, 3);
    }
    
    #[test]
    fun test_security_blacklist() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Add alice to blacklist
        security::add_to_blacklist(&deployer, alice_addr);
        
        // Check alice is in blacklist
        let blacklist = security::get_blacklist();
        assert!(blacklist.length() == 1, 1);
        assert!(blacklist[0] == alice_addr, 2);
        
        // Try to transfer (should fail for blacklisted address)
        assert!(!security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 3);
        
        // Remove alice from blacklist
        security::remove_from_blacklist(&deployer, alice_addr);
        
        // Check alice is no longer in blacklist
        let blacklist = security::get_blacklist();
        assert!(blacklist.length() == 0, 4);
        
        // Now transfer should work
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 5);
    }
    
    #[test]
    fun test_security_whitelist() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Enable whitelist
        security::update_security_config(
            &deployer,
            security::SECURITY_LEVEL_HIGH,
            true, // enable_rate_limiting
            10,   // max_tx_per_window
            60,   // rate_limit_window
            true, // enable_transfer_limits
            1000000000000, // max_transfer_amount
            true, // enable_daily_limits
            5000000000000, // max_daily_amount
            true, // enable_blacklist
            true  // enable_whitelist
        );
        
        // Add alice to whitelist
        security::add_to_whitelist(&deployer, alice_addr);
        
        // Check alice is in whitelist
        let whitelist = security::get_whitelist();
        assert!(whitelist.length() == 1, 1);
        assert!(whitelist[0] == alice_addr, 2);
        
        // Alice should be able to transfer
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 3);
        
        // Bob should not be able to transfer (not in whitelist)
        assert!(!security::is_action_allowed(&bob, security::ACTION_TRANSFER, MIN_AMOUNT), 4);
        
        // Remove alice from whitelist
        security::remove_from_whitelist(&deployer, alice_addr);
        
        // Check alice is no longer in whitelist
        let whitelist = security::get_whitelist();
        assert!(whitelist.length() == 0, 5);
        
        // Now alice should not be able to transfer
        assert!(!security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 6);
    }
    
    #[test]
    fun test_security_emergency_pause() {
        let (deployer, _, alice, _, _, _) = setup_test_env();
        
        // Set emergency admin
        security::set_emergency_admin(&deployer, alice);
        
        // Get security config
        let (_, _, _, _, _, _, _, _, _, _, _, emergency_admin) = security::get_security_config();
        assert!(emergency_admin == signer::address_of(&alice), 1);
        
        // Alice can emergency pause
        security::emergency_pause(&alice);
        
        // Check contract is paused
        assert!(security::is_contract_paused(), 2);
    }
    
    #[test]
    fun test_security_rate_limiting() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Configure strict rate limiting
        security::update_security_config(
            &deployer,
            security::SECURITY_LEVEL_HIGH,
            true, // enable_rate_limiting
            2,    // max_tx_per_window
            60,   // rate_limit_window
            true, // enable_transfer_limits
            1000000000000, // max_transfer_amount
            true, // enable_daily_limits
            5000000000000, // max_daily_amount
            true, // enable_blacklist
            false // enable_whitelist
        );
        
        // First transfer should work
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 1);
        payments::direct_transfer(&alice, bob_addr, 0, MIN_AMOUNT);
        
        // Second transfer should work
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 2);
        payments::direct_transfer(&alice, bob_addr, 0, MIN_AMOUNT);
        
        // Third transfer should fail (rate limit exceeded)
        assert!(!security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 3);
    }
    
    #[test]
    fun test_security_transfer_limits() {
        let (deployer, _, alice, alice_addr, bob, bob_addr) = setup_two_users();
        
        // Configure strict transfer limits
        security::update_security_config(
            &deployer,
            security::SECURITY_LEVEL_HIGH,
            true, // enable_rate_limiting
            10,   // max_tx_per_window
            60,   // rate_limit_window
            true, // enable_transfer_limits
            MIN_AMOUNT, // max_transfer_amount
            true, // enable_daily_limits
            5000000000000, // max_daily_amount
            true, // enable_blacklist
            false // enable_whitelist
        );
        
        // Transfer within limit should work
        assert!(security::is_action_allowed(&alice, security::ACTION_TRANSFER, MIN_AMOUNT), 1);
        
        // Transfer exceeding limit should fail
