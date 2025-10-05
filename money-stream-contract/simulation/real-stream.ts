// Real USDC Streaming Test with Two Private Keys
import { Account, Network, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { USDCStreamingClient } from "./usdc-client";

// ============================================
// CONFIGURATION - Replace with your keys
// ============================================
const EMPLOYER_PRIVATE_KEY = "YOUR_PRIVATE_KEY_WANT_TO_GIVE_MONEY"; // Replace this
const EMPLOYEE_PRIVATE_KEY = "YOUR_PRIVATE_KEY_WANT_TO_RECEIVE_MONEY"; // Replace this

// Stream parameters
const MONTHLY_SALARY = 1; // $1 per month
const DURATION_MONTHS = 3;   // 3 months

// ============================================
// Main Script
// ============================================
async function main() {
  console.log("🚀 USDC STREAMING - REAL TESTNET TEST");
  console.log("=" .repeat(60));
  
  // Initialize client
  const client = new USDCStreamingClient(Network.TESTNET);
  
  // Load accounts from private keys
  console.log("\n🔑 Loading accounts from private keys...");
  
  const employer = USDCStreamingClient.createAccountFromPrivateKey(EMPLOYER_PRIVATE_KEY);
  const employee = USDCStreamingClient.createAccountFromPrivateKey(EMPLOYEE_PRIVATE_KEY);
  
  console.log("✅ Accounts loaded:");
  console.log(`   Employer: ${employer.accountAddress.toString()}`);
  console.log(`   Employee: ${employee.accountAddress.toString()}`);
  
  // Step 1: Check if registries need initialization
  console.log("\n" + "=".repeat(60));
  console.log("STEP 1: Initialize Registries");
  console.log("=".repeat(60));
  
  try {
    console.log("\n🔧 Initializing employer (sender) registry...");
    const senderTx = await client.initSender(employer);
    console.log(`✅ Employer initialized: ${senderTx}`);
  } catch (error: any) {
    if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
      console.log("ℹ️  Employer registry already initialized");
    } else {
      console.error("❌ Error initializing employer:", error.message);
      throw error;
    }
  }
  
  try {
    console.log("\n🔧 Initializing employee (recipient) registry...");
    const recipientTx = await client.initRecipient(employee);
    console.log(`✅ Employee initialized: ${recipientTx}`);
  } catch (error: any) {
    if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
      console.log("ℹ️  Employee registry already initialized");
    } else {
      console.error("❌ Error initializing employee:", error.message);
      throw error;
    }
  }
  
  // Step 2: Create stream
  console.log("\n" + "=".repeat(60));
  console.log("STEP 2: Create Payment Stream");
  console.log("=".repeat(60));
  
  console.log(`\n💰 Creating stream:`);
  console.log(`   Monthly: $${MONTHLY_SALARY.toLocaleString()}`);
  console.log(`   Duration: ${DURATION_MONTHS} months`);
  console.log(`   Total: $${(MONTHLY_SALARY * DURATION_MONTHS).toLocaleString()}`);
  
  const rate = client.calculateRate(MONTHLY_SALARY, DURATION_MONTHS);
  console.log(`   Rate: ${rate} per second`);
  
  let streamAddress: string;
  
  try {
    const result = await client.createStream(
      employer,
      employee.accountAddress.toString(),
      MONTHLY_SALARY,
      DURATION_MONTHS
    );
    
    streamAddress = result.streamAddress;
    
    console.log(`\n✅ Stream created successfully!`);
    console.log(`   Transaction: ${result.transactionHash}`);
    console.log(`   Stream: ${streamAddress}`);
    console.log(`   Explorer: https://explorer.aptoslabs.com/txn/${result.transactionHash}?network=testnet`);
  } catch (error: any) {
    console.error("\n❌ Failed to create stream:");
    console.error(error.message);
    
    if (error.message?.includes("INSUFFICIENT_BALANCE")) {
      console.log("\n💡 Solution: Fund employer with USDC");
      console.log(`   Employer needs ${MONTHLY_SALARY * DURATION_MONTHS} USDC`);
    }
    
    throw error;
  }
  
  // Step 3: Check stream info
  console.log("\n" + "=".repeat(60));
  console.log("STEP 3: Check Stream Info");
  console.log("=".repeat(60));
  
  const info = await client.getStreamInfo(streamAddress);
  
  console.log("\n📊 Stream Details:");
  console.log(`   Sender: ${info.sender}`);
  console.log(`   Recipient: ${info.recipient}`);
  console.log(`   Rate: ${info.ratePerSecond} per second`);
  console.log(`   Start: ${new Date(info.startTime * 1000).toLocaleString()}`);
  console.log(`   End: ${new Date(info.endTime * 1000).toLocaleString()}`);
  console.log(`   Balance: ${Number(info.balance) / 1_000_000} USDC`);
  console.log(`   Active: ${info.isActive ? "✅ Yes" : "❌ No"}`);
  
  // Step 4: Wait and withdraw
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Wait and Withdraw");
  console.log("=".repeat(60));
  
  console.log("\n⏳ Waiting 30 seconds for earnings to accumulate...");
  console.log("   (In production, employee can withdraw anytime)");
  
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  console.log("\n💰 Checking withdrawable amount...");
  const withdrawable = await client.getWithdrawableAmount(streamAddress);
  console.log(`   Withdrawable: ${Number(withdrawable) / 1_000_000} USDC`);
  
  if (withdrawable > BigInt(0)) {
    console.log("\n💸 Employee withdrawing earnings...");
    const withdrawTx = await client.withdraw(employee, streamAddress);
    console.log(`✅ Withdrawal successful: ${withdrawTx}`);
    console.log(`   Explorer: https://explorer.aptoslabs.com/txn/${withdrawTx}?network=testnet`);
    
    // Check updated stream info
    const updatedInfo = await client.getStreamInfo(streamAddress);
    console.log("\n📊 Updated Stream:");
    console.log(`   Balance: ${Number(updatedInfo.balance) / 1_000_000} USDC`);
    console.log(`   Withdrawn: ${Number(updatedInfo.totalWithdrawn) / 1_000_000} USDC`);
  } else {
    console.log("ℹ️  No funds to withdraw yet (try waiting longer)");
  }
  
  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST COMPLETED SUCCESSFULLY!");
  console.log("=".repeat(60));
  
  console.log("\n📈 Summary:");
  console.log(`   Stream Address: ${streamAddress}`);
  console.log(`   Employer: ${employer.accountAddress.toString()}`);
  console.log(`   Employee: ${employee.accountAddress.toString()}`);
  console.log(`   Monthly: $${MONTHLY_SALARY.toLocaleString()}`);
  console.log(`   Duration: ${DURATION_MONTHS} months`);
  
  console.log("\n💡 Next Steps:");
  console.log("   1. Employee can withdraw anytime using: client.withdraw()");
  console.log("   2. Check stream status: client.getStreamInfo()");
  console.log("   3. Employer can top up: client.topUp()");
  console.log("   4. View in explorer: https://explorer.aptoslabs.com");
}

// Run the script
main().catch((error) => {
  console.error("\n❌ Script failed:");
  console.error(error);
  process.exit(1);
});
