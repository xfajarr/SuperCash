/// Deployment script for SuperCash payments system
/// This script can be used to deploy and initialize the contract
script {
    use std::signer;
    use aptos_framework::account;
    use supercash::payments;
    
    /// Deploy and initialize the SuperCash payments system
    /// This function is called once during deployment
    fun deploy(deployer: &signer) {
        // The init_module function is called automatically
        // when the module is published, so we don't need to call it explicitly
        
        // Optional: perform any additional setup here
        // The contract is now ready for use
        
        // The system is now ready for use
    }
}