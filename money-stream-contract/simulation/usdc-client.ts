// USDC Streaming Client for Aptos
import { Aptos, AptosConfig, Account, Network, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

const MODULE_ADDRESS = "0x93145d26d512e8d4e8b69fba3f62bfde2a1170b12e924f6dbb806b54fb245cd5";
// LayerZero USDC Metadata Object Address
const USDC_METADATA = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
const PRECISION = 1_000_000;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export class USDCStreamingClient {
  private aptos: Aptos;
  private network: Network;

  constructor(network: Network = Network.TESTNET) {
    this.aptos = new Aptos(new AptosConfig({ network }));
    this.network = network;
    console.log(`Connected to ${network}`);
    console.log(`Module: ${MODULE_ADDRESS}`);
  }

  calculateRate(monthlyAmount: number, durationMonths: number = 1): bigint {
    const totalSeconds = BigInt(durationMonths) * BigInt(SECONDS_PER_MONTH);
    const totalAmount = BigInt(monthlyAmount * 1_000_000);
    const rateWithPrecision = (totalAmount * BigInt(PRECISION)) / totalSeconds;
    return rateWithPrecision;
  }

  async initSender(sender: Account): Promise<string> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: sender.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::init_sender`,
        typeArguments: [], // No type arguments needed!
        functionArguments: [],
      },
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: sender,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log(`Sender initialized: ${committedTxn.hash}`);
    return committedTxn.hash;
  }

  async initRecipient(recipient: Account): Promise<string> {
    const transaction = await this.aptos.transaction.build.simple({
      sender: recipient.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::init_recipient`,
        typeArguments: [], // No type arguments needed!
        functionArguments: [],
      },
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: recipient,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log(`Recipient initialized: ${committedTxn.hash}`);
    return committedTxn.hash;
  }

  async createStream(
    sender: Account,
    recipientAddress: string,
    monthlyUSDC: number,
    durationMonths: number = 3
  ): Promise<{ transactionHash: string; streamAddress: string }> {
    console.log(`\nCreating stream: $${monthlyUSDC}/month for ${durationMonths} months`);

    const ratePerSecond = this.calculateRate(monthlyUSDC, durationMonths);
    const totalAmount = BigInt(monthlyUSDC * durationMonths * 1_000_000);
    const durationSeconds = BigInt(durationMonths * SECONDS_PER_MONTH);
    const endTime = Math.floor(Date.now() / 1000) + Number(durationSeconds);

    const streamAddress = await this.getStreamAddress(
      sender.accountAddress.toString(),
      recipientAddress
    );

    const transaction = await this.aptos.transaction.build.simple({
      sender: sender.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::create_stream`,
        typeArguments: [], // create_stream doesn't take type arguments
        functionArguments: [
          recipientAddress,
          USDC_METADATA,  // asset_metadata parameter
          ratePerSecond.toString(),
          totalAmount.toString(),
          Number(durationSeconds),
          true, // is_cancelable
        ],
      },
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: sender,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log(`Stream created: ${committedTxn.hash}`);
    console.log(`Stream address: ${streamAddress}`);

    return { transactionHash: committedTxn.hash, streamAddress };
  }

  async withdraw(recipient: Account, streamAddress: string): Promise<string> {
    const withdrawable = await this.getWithdrawableAmount(streamAddress);
    console.log(`Withdrawing: ${Number(withdrawable) / 1_000_000} USDC`);

    if (withdrawable === BigInt(0)) {
      console.log(`No funds available`);
      return "";
    }

    const transaction = await this.aptos.transaction.build.simple({
      sender: recipient.accountAddress,
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::withdraw`,
        typeArguments: [], // No type arguments
        functionArguments: [streamAddress],
      },
    });

    const committedTxn = await this.aptos.signAndSubmitTransaction({
      signer: recipient,
      transaction,
    });

    await this.aptos.waitForTransaction({ transactionHash: committedTxn.hash });
    console.log(`Withdrawal successful: ${committedTxn.hash}`);
    return committedTxn.hash;
  }

  async getTotalStreams(): Promise<number> {
    const result = await this.aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_total_streams_created`,
        typeArguments: [],
        functionArguments: [],
      },
    });
    return Number(result[0]);
  }

  async getStreamAddress(senderAddress: string, recipientAddress: string): Promise<string> {
    const result = await this.aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_stream_address`,
        typeArguments: [], // No type arguments
        functionArguments: [senderAddress, recipientAddress],
      },
    });
    return result[0] as string;
  }

  async getWithdrawableAmount(streamAddress: string): Promise<bigint> {
    const result = await this.aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_withdrawable_amount`,
        typeArguments: [], // No type arguments
        functionArguments: [streamAddress],
      },
    });
    return BigInt(result[0] as string);
  }

  async getStreamInfo(streamAddress: string) {
    const result = await this.aptos.view({
      payload: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_stream_info`,
        typeArguments: [], // No type arguments
        functionArguments: [streamAddress],
      },
    });

    return {
      sender: result[0] as string,
      recipient: result[1] as string,
      assetMetadata: result[2] as string,        // Index 2: asset_metadata
      ratePerSecond: BigInt(result[3] as string), // Index 3: rate_per_second
      startTime: Number(result[4]),               // Index 4: start_time
      endTime: Number(result[5]),                 // Index 5: end_time
      balance: BigInt(result[6] as string),       // Index 6: balance
      totalWithdrawn: BigInt(result[7] as string),// Index 7: total_withdrawn
      totalDeposited: BigInt(result[8] as string),// Index 8: total_deposited
      isActive: result[9] as boolean,             // Index 9: is_active
    };
  }

  static createAccountFromPrivateKey(privateKeyHex: string): Account {
    const privateKey = new Ed25519PrivateKey(privateKeyHex);
    return Account.fromPrivateKey({ privateKey });
  }
}
