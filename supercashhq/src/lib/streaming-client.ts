// USDC Streaming Client for Aptos - Frontend Version
import { Aptos, AptosConfig, Network, InputViewFunctionData } from "@aptos-labs/ts-sdk";

const MODULE_ADDRESS = "0x93145d26d512e8d4e8b69fba3f62bfde2a1170b12e924f6dbb806b54fb245cd5";
const USDC_METADATA = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
const PRECISION = 1_000_000;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

export interface StreamInfo {
  sender: string;
  recipient: string;
  assetMetadata: string;
  ratePerSecond: bigint;
  startTime: number;
  endTime: number;
  balance: bigint;
  totalWithdrawn: bigint;
  totalDeposited: bigint;
  isActive: boolean;
}

export class StreamingClient {
  private aptos: Aptos;
  private network: Network;

  constructor(network: Network = Network.TESTNET) {
    this.aptos = new Aptos(new AptosConfig({ network }));
    this.network = network;
  }

  /**
   * Calculate rate per second with precision
   */
  calculateRate(monthlyAmount: number, durationMonths: number = 1): bigint {
    const totalSeconds = BigInt(durationMonths) * BigInt(SECONDS_PER_MONTH);
    const totalAmount = BigInt(Math.floor(monthlyAmount * 1_000_000)); // Convert to micro USDC
    const rateWithPrecision = (totalAmount * BigInt(PRECISION)) / totalSeconds;
    return rateWithPrecision;
  }

  /**
   * Build transaction for initializing sender registry
   */
  buildInitSenderTransaction(senderAddress: string) {
    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::init_sender` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [],
      },
    };
  }

  /**
   * Build transaction for initializing recipient registry
   */
  buildInitRecipientTransaction(recipientAddress: string) {
    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::init_recipient` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [],
      },
    };
  }

  /**
   * Build transaction for creating a stream
   */
  buildCreateStreamTransaction(
    recipientAddress: string,
    monthlyUSDC: number,
    durationMonths: number = 1
  ) {
    const ratePerSecond = this.calculateRate(monthlyUSDC, durationMonths);
    const totalAmount = BigInt(Math.floor(monthlyUSDC * durationMonths * 1_000_000));
    const durationSeconds = BigInt(durationMonths * SECONDS_PER_MONTH);

    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::create_stream` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [
          recipientAddress,
          USDC_METADATA,
          ratePerSecond.toString(),
          totalAmount.toString(),
          Number(durationSeconds),
          true, // is_cancelable
        ],
      },
    };
  }

  /**
   * Build transaction for withdrawing from a stream
   */
  buildWithdrawTransaction(streamAddress: string) {
    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::withdraw` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [streamAddress],
      },
    };
  }

  /**
   * Build transaction for topping up a stream
   */
  buildTopUpTransaction(streamAddress: string, amount: number) {
    const amountMicro = BigInt(Math.floor(amount * 1_000_000));
    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::top_up` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [streamAddress, amountMicro.toString()],
      },
    };
  }

  /**
   * Build transaction for canceling a stream
   */
  buildCancelStreamTransaction(streamAddress: string) {
    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::cancel_stream` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [streamAddress],
      },
    };
  }

  /**
   * Get total streams created
   */
  async getTotalStreams(): Promise<number> {
    const payload: InputViewFunctionData = {
      function: `${MODULE_ADDRESS}::stream_basic_fa::get_total_streams_created`,
      typeArguments: [],
      functionArguments: [],
    };
    const result = await this.aptos.view({ payload });
    return Number(result[0]);
  }

  /**
   * Get stream address for sender-recipient pair
   */
  async getStreamAddress(senderAddress: string, recipientAddress: string): Promise<string> {
    const payload: InputViewFunctionData = {
      function: `${MODULE_ADDRESS}::stream_basic_fa::get_stream_address`,
      typeArguments: [],
      functionArguments: [senderAddress, recipientAddress],
    };
    const result = await this.aptos.view({ payload });
    return result[0] as string;
  }

  /**
   * Get withdrawable amount from a stream
   */
  async getWithdrawableAmount(streamAddress: string): Promise<bigint> {
    try {
      const payload: InputViewFunctionData = {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_withdrawable_amount`,
        typeArguments: [],
        functionArguments: [streamAddress],
      };
      const result = await this.aptos.view({ payload });
      return BigInt(result[0] as string);
    } catch (error) {
      console.error("Error getting withdrawable amount:", error);
      return BigInt(0);
    }
  }

  /**
   * Get full stream information
   */
  async getStreamInfo(streamAddress: string): Promise<StreamInfo | null> {
    try {
      const payload: InputViewFunctionData = {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_stream_info`,
        typeArguments: [],
        functionArguments: [streamAddress],
      };
      const result = await this.aptos.view({ payload });

      return {
        sender: result[0] as string,
        recipient: result[1] as string,
        assetMetadata: result[2] as string,
        ratePerSecond: BigInt(result[3] as string),
        startTime: Number(result[4]),
        endTime: Number(result[5]),
        balance: BigInt(result[6] as string),
        totalWithdrawn: BigInt(result[7] as string),
        totalDeposited: BigInt(result[8] as string),
        isActive: result[9] as boolean,
      };
    } catch (error) {
      console.error("Error getting stream info:", error);
      return null;
    }
  }

  /**
   * Get all streams for a sender
   */
  async getSenderStreams(senderAddress: string): Promise<string[]> {
    try {
      const payload: InputViewFunctionData = {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_sender_streams`,
        typeArguments: [],
        functionArguments: [senderAddress],
      };
      const result = await this.aptos.view({ payload });
      return result[0] as string[];
    } catch (error) {
      console.error("Error getting sender streams:", error);
      return [];
    }
  }

  /**
   * Get all streams for a recipient
   */
  async getRecipientStreams(recipientAddress: string): Promise<string[]> {
    try {
      const payload: InputViewFunctionData = {
        function: `${MODULE_ADDRESS}::stream_basic_fa::get_recipient_streams`,
        typeArguments: [],
        functionArguments: [recipientAddress],
      };
      const result = await this.aptos.view({ payload });
      return result[0] as string[];
    } catch (error) {
      console.error("Error getting recipient streams:", error);
      return [];
    }
  }

  /**
   * Format micro USDC to USDC
   */
  formatUSDC(microAmount: bigint): string {
    return (Number(microAmount) / 1_000_000).toFixed(6);
  }

  /**
   * Get network explorer URL
   */
  getExplorerUrl(txHash: string): string {
    const networkName = this.network === Network.MAINNET ? "mainnet" : "testnet";
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${networkName}`;
  }

  /**
   * Get module address
   */
  getModuleAddress(): string {
    return MODULE_ADDRESS;
  }

  /**
   * Get USDC metadata address
   */
  getUSDCMetadata(): string {
    return USDC_METADATA;
  }
}

// Export singleton instance
export const streamingClient = new StreamingClient(Network.TESTNET);
