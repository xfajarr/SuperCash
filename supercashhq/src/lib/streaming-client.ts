// USDC Streaming Client for Aptos - Frontend Version
import { Aptos, AptosConfig, Network, InputViewFunctionData } from "@aptos-labs/ts-sdk";

const MODULE_ADDRESS = "0x93145d26d512e8d4e8b69fba3f62bfde2a1170b12e924f6dbb806b54fb245cd5";
const USDC_METADATA = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";
const PRECISION = 1_000_000;
const SECONDS_PER_MONTH = 30 * 24 * 60 * 60;

// Time period constants
export const SECONDS_PER_PERIOD = {
  hour: 3600,
  day: 86400,
  week: 604800,
  month: 2592000, // 30 days
  year: 31536000  // 365 days
} as const;

export type TimePeriod = keyof typeof SECONDS_PER_PERIOD;

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
   * Check if recipient registry exists (no signature needed)
   * This prevents unnecessary transaction popups when already initialized
   */
  async checkIfRecipientRegistryExists(recipientAddress: string): Promise<boolean> {
    try {
      // Check localStorage cache first (instant)
      const cacheKey = `registry_init_${recipientAddress}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached === 'true') {
        console.log("✅ Registry exists (cached)");
        return true;
      }

      // Query on-chain resource
      const resourceType = `${MODULE_ADDRESS}::stream_basic_fa::RecipientRegistry`;
      const resource = await this.aptos.getAccountResource({
        accountAddress: recipientAddress,
        resourceType: resourceType,
      });

      // Cache the result if exists
      if (resource) {
        localStorage.setItem(cacheKey, 'true');
        console.log("✅ Registry exists (verified on-chain)");
        return true;
      }

      return false;
    } catch (error: any) {
      // Resource not found errors are expected for uninitialized registries
      if (error.message?.includes("Resource not found") || error.status === 404) {
        console.log("ℹ️ Registry does not exist yet");
        return false;
      }

      console.error("Error checking registry existence:", error);
      return false; // Assume doesn't exist on error
    }
  }

  /**
   * Check if sender registry exists (no signature needed)
   */
  async checkIfSenderRegistryExists(senderAddress: string): Promise<boolean> {
    try {
      // Check localStorage cache first
      const cacheKey = `sender_registry_init_${senderAddress}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached === 'true') {
        console.log("✅ Sender registry exists (cached)");
        return true;
      }

      // Query on-chain resource
      const resourceType = `${MODULE_ADDRESS}::stream_basic_fa::SenderRegistry`;
      const resource = await this.aptos.getAccountResource({
        accountAddress: senderAddress,
        resourceType: resourceType,
      });

      // Cache the result if exists
      if (resource) {
        localStorage.setItem(cacheKey, 'true');
        console.log("✅ Sender registry exists (verified on-chain)");
        return true;
      }

      return false;
    } catch (error: any) {
      if (error.message?.includes("Resource not found") || error.status === 404) {
        console.log("ℹ️ Sender registry does not exist yet");
        return false;
      }

      console.error("Error checking sender registry existence:", error);
      return false;
    }
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
   * @param recipientAddress - Address receiving the stream
   * @param totalAmount - Total USDC amount to stream
   * @param duration - Number of duration units
   * @param durationUnit - Unit of duration (hour/day/week/month/year)
   */
  buildCreateStreamTransaction(
    recipientAddress: string,
    totalAmount: number,
    duration: number = 1,
    durationUnit: TimePeriod = 'month'
  ) {
    // Calculate total duration in seconds
    const totalDurationSeconds = BigInt(Math.floor(duration * SECONDS_PER_PERIOD[durationUnit]));

    // Convert total amount to micro USDC
    const totalAmountMicroUSDC = totalAmount * 1_000_000;

    // Calculate amount per second (in micro USDC)
    const amountPerSecond = totalAmountMicroUSDC / Number(totalDurationSeconds);

    // Apply precision for on-chain storage
    const ratePerSecond = BigInt(Math.floor(amountPerSecond * PRECISION));

    // Total amount in micro USDC
    const totalAmountBigInt = BigInt(Math.floor(totalAmountMicroUSDC));

    return {
      data: {
        function: `${MODULE_ADDRESS}::stream_basic_fa::create_stream` as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [
          recipientAddress,
          USDC_METADATA,
          ratePerSecond.toString(),
          totalAmountBigInt.toString(),
          Number(totalDurationSeconds),
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
   * Get all streams for a recipient (from registry)
   * Note: Only returns streams if recipient initialized registry BEFORE stream creation
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
   * Get all streams for a sender using event indexing (RECOMMENDED)
   * This finds ALL streams including cancelled/depleted ones
   * Uses Nodit GraphQL indexer to query StreamCreatedEvent events
   */
  async getSenderStreamsByEvents(senderAddress: string): Promise<string[]> {
    try {
      console.log("🔍 Querying events for sender:", senderAddress);

      // Query Nodit GraphQL indexer for StreamCreatedEvent events
      const eventType = `${MODULE_ADDRESS}::stream_basic_fa::StreamCreatedEvent`;

      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetSenderStreams($eventType: String!, $sender: String!) {
              events(
                where: {
                  indexed_type: { _eq: $eventType }
                  data: { _contains: { sender: $sender } }
                }
                order_by: { transaction_version: desc }
              ) {
                data
                indexed_type
                sequence_number
              }
            }
          `,
          variables: {
            eventType: eventType,
            sender: senderAddress
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL query failed");
      }

      // Extract stream addresses from events
      const events = result.data?.events || [];
      const streamAddresses = events
        .map((event: any) => event.data?.stream_address)
        .filter((addr: any) => addr != null);

      console.log(`✅ Found ${streamAddresses.length} streams via events`);

      return streamAddresses;
    } catch (error) {
      console.error("❌ Error getting sender streams by events:", error);
      return [];
    }
  }

  /**
   * Get all streams for a recipient using event indexing (RECOMMENDED)
   * This finds ALL streams regardless of registry initialization
   * Uses Nodit GraphQL indexer to query StreamCreatedEvent events
   */
  async getRecipientStreamsByEvents(recipientAddress: string): Promise<string[]> {
    try {
      console.log("🔍 Querying events for recipient:", recipientAddress);

      // Query Nodit GraphQL indexer for StreamCreatedEvent events
      const eventType = `${MODULE_ADDRESS}::stream_basic_fa::StreamCreatedEvent`;

      const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetRecipientStreams($eventType: String!, $recipient: String!) {
              events(
                where: {
                  indexed_type: { _eq: $eventType }
                  data: { _contains: { recipient: $recipient } }
                }
                order_by: { transaction_version: desc }
              ) {
                data
                indexed_type
                sequence_number
              }
            }
          `,
          variables: {
            eventType: eventType,
            recipient: recipientAddress
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        console.error("GraphQL errors:", result.errors);
        throw new Error(result.errors[0]?.message || "GraphQL query failed");
      }

      // Extract stream addresses from events
      const events = result.data?.events || [];
      const streamAddresses = events
        .map((event: any) => event.data?.stream_address)
        .filter((addr: any) => addr != null);

      console.log(`✅ Found ${streamAddresses.length} streams via events`);

      return streamAddresses;
    } catch (error) {
      console.error("❌ Error getting recipient streams by events:", error);
      return [];
    }
  }

  /**
   * Debug: Get GraphQL schema structure for events
   * Use this to verify the correct field names
   */
  async debugEventSchema(): Promise<any> {
    try {
      const response = await fetch('/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query DebugEvents {
              events(limit: 1) {
                indexed_type
                type
                data
                sequence_number
                transaction_version
              }
            }
          `
        })
      });

      const result = await response.json();
      console.log("📊 GraphQL Event Schema:", JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.error("Error debugging schema:", error);
      return null;
    }
  }

  /**
   * Hybrid approach: Get sender streams from both registry and events
   * This ensures we find ALL streams including cancelled/depleted ones
   *
   * Layer 1: Event discovery (primary - finds everything including inactive)
   * Layer 2: Registry query (secondary - fast fallback)
   */
  async getSenderStreamsHybrid(senderAddress: string): Promise<string[]> {
    const results = new Set<string>();

    console.log("🔎 Starting hybrid stream discovery for sender:", senderAddress);

    // Run both queries in parallel using allSettled (one failure doesn't block the other)
    const [eventResult, registryResult] = await Promise.allSettled([
      this.getSenderStreamsByEvents(senderAddress),
      this.getSenderStreams(senderAddress),
    ]);

    // Layer 1: Event discovery (primary source - includes cancelled/inactive)
    if (eventResult.status === 'fulfilled') {
      eventResult.value.forEach(addr => results.add(addr));
      console.log(`📡 Event discovery: ${eventResult.value.length} streams`);
    } else {
      console.warn("⚠️ Event discovery failed:", eventResult.reason);
    }

    // Layer 2: Registry query (secondary source - only active streams)
    if (registryResult.status === 'fulfilled') {
      registryResult.value.forEach(addr => results.add(addr));
      console.log(`📋 Registry query: ${registryResult.value.length} streams`);
    } else {
      console.warn("⚠️ Registry query failed:", registryResult.reason);
    }

    const totalStreams = Array.from(results);

    console.log(`✨ Total unique streams found: ${totalStreams.length}`);
    console.log(`   - Event method: ${eventResult.status === 'fulfilled' ? '✅' : '❌'}`);
    console.log(`   - Registry method: ${registryResult.status === 'fulfilled' ? '✅' : '❌'}`);

    return totalStreams;
  }

  /**
   * Hybrid approach: Get streams from both registry and events (3-layer fallback)
   * This ensures we find ALL streams regardless of initialization order
   *
   * Layer 1: Event discovery (primary - finds everything)
   * Layer 2: Registry query (secondary - fast for initialized users)
   * Layer 3: Manual finder UI (handled by component)
   */
  async getRecipientStreamsHybrid(recipientAddress: string): Promise<string[]> {
    const results = new Set<string>();

    console.log("🔎 Starting hybrid stream discovery for:", recipientAddress);

    // Run both queries in parallel using allSettled (one failure doesn't block the other)
    const [eventResult, registryResult] = await Promise.allSettled([
      this.getRecipientStreamsByEvents(recipientAddress),
      this.getRecipientStreams(recipientAddress),
    ]);

    // Layer 1: Event discovery (primary source)
    if (eventResult.status === 'fulfilled') {
      eventResult.value.forEach(addr => results.add(addr));
      console.log(`📡 Event discovery: ${eventResult.value.length} streams`);
    } else {
      console.warn("⚠️ Event discovery failed:", eventResult.reason);
    }

    // Layer 2: Registry query (secondary source)
    if (registryResult.status === 'fulfilled') {
      registryResult.value.forEach(addr => results.add(addr));
      console.log(`📋 Registry query: ${registryResult.value.length} streams`);
    } else {
      console.warn("⚠️ Registry query failed:", registryResult.reason);
    }

    const totalStreams = Array.from(results);

    console.log(`✨ Total unique streams found: ${totalStreams.length}`);
    console.log(`   - Event method: ${eventResult.status === 'fulfilled' ? '✅' : '❌'}`);
    console.log(`   - Registry method: ${registryResult.status === 'fulfilled' ? '✅' : '❌'}`);

    return totalStreams;
  }

  /**
   * Format micro USDC to USDC
   */
  formatUSDC(microAmount: bigint): string {
    return (Number(microAmount) / 1_000_000).toFixed(6);
  }

  /**
   * Format rate per second to human-readable format
   * The on-chain rate is stored as: (micro_usdc * PRECISION) / seconds
   * So we need to divide by PRECISION (1M) and by 1M (micro to USDC)
   */
  formatRate(ratePerSecond: bigint | number, unit: 'second' | 'minute' | 'hour' | 'day' | 'month' = 'month'): string {
    const PRECISION = 1_000_000;
    const MICRO_TO_USDC = 1_000_000;

    // Convert to actual USDC per second
    const usdcPerSecond = Number(ratePerSecond) / PRECISION / MICRO_TO_USDC;

    // Convert to requested time unit
    let multiplier = 1;
    switch (unit) {
      case 'second':
        multiplier = 1;
        break;
      case 'minute':
        multiplier = 60;
        break;
      case 'hour':
        multiplier = 3600;
        break;
      case 'day':
        multiplier = 86400;
        break;
      case 'month':
        multiplier = 2592000; // 30 days
        break;
    }

    const rate = usdcPerSecond * multiplier;

    // Format based on magnitude
    if (rate < 0.01) {
      return rate.toFixed(6);
    } else if (rate < 1) {
      return rate.toFixed(4);
    } else {
      return rate.toFixed(2);
    }
  }

  /**
   * Get network explorer URL
   */
  getExplorerUrl(txHash: string): string {
    const networkName = this.network === Network.MAINNET ? "mainnet" : "testnet";
    return `https://explorer.aptoslabs.com/txn/${txHash}?network=${networkName}`;
  }

  /**
   * Clear registry cache for a specific address
   * Useful when switching wallets or networks
   */
  clearRegistryCache(address: string) {
    localStorage.removeItem(`registry_init_${address}`);
    localStorage.removeItem(`sender_registry_init_${address}`);
    console.log(`🗑️ Cleared registry cache for ${address}`);
  }

  /**
   * Clear all registry caches
   * Useful when switching networks
   */
  clearAllRegistryCaches() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('registry_init_') || key.startsWith('sender_registry_init_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('🗑️ Cleared all registry caches');
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
