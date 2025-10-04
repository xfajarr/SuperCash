// import { AptosClient } from 'aptos';
import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNetwork } from "@/contexts/NetworkContext";
import { CURRENT_TOKENS, MONEY_STREAM_CONTRACT_ADDRESS } from "@/config/constants";
import { useAptosTransaction } from "./useAptosTransaction";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { toast } from "sonner";

// Define types for stream data
export interface StreamDetails {
  stream_id: number;
  sender: string;
  recipient: string;
  total_amount: number;
  withdrawn_amount: number;
  start_time: number;
  end_time: number;
  cliff_timestamp: number;
  is_active: boolean;
  flow_rate_per_second: number;
  asset_type: string;
}

export interface FlowRate {
  per_second: number;
  per_minute: number;
  per_hour: number;
  per_day: number;
  per_week: number;
  per_month: number;
}

export const useMoneyStream = () => {
  const { account, connected } = useWallet();
  const { network } = useNetwork();
  const { executeTransaction, isSubmitting } = useAptosTransaction();
  const [streams, setStreams] = useState<StreamDetails[]>([]);
  const [incomingStreams, setIncomingStreams] = useState<StreamDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const aptosConfig = new AptosConfig({ network: network === "mainnet" ? Network.MAINNET : Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  // Fetch user's streams (both created and received)
  const fetchUserStreams = async () => {
    if (!connected || !account) return;
    
    setIsLoading(true);
    try {
      // Fetch outgoing streams (streams created by the user)
      // This would typically be done by querying the blockchain for resources
      // For now, we'll leave this as a placeholder
      
      // Fetch incoming streams (streams received by the user)
      // This is a simplified approach - in a real app, you might need to query events or use a different method
      
      // For now, we'll use mock data for demonstration
      const mockIncomingStreams: StreamDetails[] = [];
      
      setStreams([]);
      setIncomingStreams(mockIncomingStreams);
    } catch (error) {
      console.error("Error fetching streams:", error);
      toast.error("Failed to fetch streams");
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize hub for coin streams
  const initializeHubCoin = async (coinType: string) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::initialize_hub_coin`,
      typeArguments: [coinType],
      functionArguments: [],
    };

    return await executeTransaction(payload, {
      successMessage: "Hub initialized successfully",
      errorMessage: "Failed to initialize hub",
    });
  };

  // Create a stream with coin
  const createStreamCoin = async (
    recipient: string,
    totalAmount: number,
    startTime: number,
    endTime: number,
    cliffDurationSeconds: number,
    coinType: string
  ) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_coin`,
      typeArguments: [coinType],
      functionArguments: [recipient, totalAmount, startTime, endTime, cliffDurationSeconds],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream created successfully",
      errorMessage: "Failed to create stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Create a stream by rate with coin
  const createStreamByRateCoin = async (
    recipient: string,
    amountPerInterval: number,
    intervalUnit: number,
    durationSeconds: number,
    cliffDurationSeconds: number,
    coinType: string
  ) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_by_rate_coin`,
      typeArguments: [coinType],
      functionArguments: [recipient, amountPerInterval, intervalUnit, durationSeconds, cliffDurationSeconds],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream created successfully",
      errorMessage: "Failed to create stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Initialize hub for fungible asset streams
  const initializeHubFa = async () => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::initialize_hub_fa`,
      functionArguments: [],
    };

    return await executeTransaction(payload, {
      successMessage: "Hub initialized successfully",
      errorMessage: "Failed to initialize hub",
    });
  };

  // Create a stream with fungible asset
  const createStreamFa = async (
    recipient: string,
    metadataAddress: string,
    totalAmount: number,
    startTime: number,
    endTime: number,
    cliffDurationSeconds: number
  ) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_fa`,
      functionArguments: [recipient, metadataAddress, totalAmount, startTime, endTime, cliffDurationSeconds],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream created successfully",
      errorMessage: "Failed to create stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Create a stream by rate with fungible asset
  const createStreamByRateFa = async (
    recipient: string,
    metadataAddress: string,
    amountPerInterval: number,
    intervalUnit: number,
    durationSeconds: number,
    cliffDurationSeconds: number
  ) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::create_stream_by_rate_fa`,
      functionArguments: [recipient, metadataAddress, amountPerInterval, intervalUnit, durationSeconds, cliffDurationSeconds],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream created successfully",
      errorMessage: "Failed to create stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Withdraw from a stream (coin)
  const withdrawFromStreamCoin = async (senderAddress: string, streamId: number, coinType: string) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::withdraw_from_stream_coin`,
      typeArguments: [coinType],
      functionArguments: [senderAddress, streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Withdrawal successful",
      errorMessage: "Failed to withdraw from stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Withdraw from a stream (fungible asset)
  const withdrawFromStreamFa = async (senderAddress: string, streamId: number) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::withdraw_from_stream_fa`,
      functionArguments: [senderAddress, streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Withdrawal successful",
      errorMessage: "Failed to withdraw from stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Pause a stream (coin)
  const pauseStreamCoin = async (streamId: number, coinType: string) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::pause_stream_coin`,
      typeArguments: [coinType],
      functionArguments: [streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream paused successfully",
      errorMessage: "Failed to pause stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Pause a stream (fungible asset)
  const pauseStreamFa = async (streamId: number) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::pause_stream_fa`,
      functionArguments: [streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream paused successfully",
      errorMessage: "Failed to pause stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Resume a stream (coin)
  const resumeStreamCoin = async (streamId: number, coinType: string) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::resume_stream_coin`,
      typeArguments: [coinType],
      functionArguments: [streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream resumed successfully",
      errorMessage: "Failed to resume stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Resume a stream (fungible asset)
  const resumeStreamFa = async (streamId: number) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::resume_stream_fa`,
      functionArguments: [streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream resumed successfully",
      errorMessage: "Failed to resume stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Cancel a stream (coin)
  const cancelStreamCoin = async (senderAddress: string, streamId: number, coinType: string) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::cancel_stream_coin`,
      typeArguments: [coinType],
      functionArguments: [senderAddress, streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream canceled successfully",
      errorMessage: "Failed to cancel stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Cancel a stream (fungible asset)
  const cancelStreamFa = async (senderAddress: string, streamId: number) => {
    const payload = {
      function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::cancel_stream_fa`,
      functionArguments: [senderAddress, streamId],
    };

    const result = await executeTransaction(payload, {
      successMessage: "Stream canceled successfully",
      errorMessage: "Failed to cancel stream",
    });

    if (result.success) {
      await fetchUserStreams();
    }

    return result;
  };

  // Get claimable amount for a stream (coin)
  const getClaimableAmountCoin = async (senderAddress: string, streamId: number, coinType: string): Promise<number> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::view_claimable_amount_coin` as `${string}::${string}::${string}`,
          typeArguments: [coinType],
          functionArguments: [senderAddress, streamId],
        },
      });

      return response[0] as number;
    } catch (error) {
      console.error("Error getting claimable amount:", error);
      return 0;
    }
  };

  // Get claimable amount for a stream (fungible asset)
  const getClaimableAmountFa = async (senderAddress: string, streamId: number): Promise<number> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::view_claimable_amount_fa` as `${string}::${string}::${string}`,
          functionArguments: [senderAddress, streamId],
        },
      });

      return response[0] as number;
    } catch (error) {
      console.error("Error getting claimable amount:", error);
      return 0;
    }
  };

  // Get flow rate for a stream (coin)
  const getFlowRateCoin = async (senderAddress: string, streamId: number, coinType: string): Promise<FlowRate> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_flow_rate_coin` as `${string}::${string}::${string}`,
          typeArguments: [coinType],
          functionArguments: [senderAddress, streamId],
        },
      });

      return {
        per_second: response[0] as number,
        per_minute: response[1] as number,
        per_hour: response[2] as number,
        per_day: response[3] as number,
        per_week: response[4] as number,
        per_month: response[5] as number,
      };
    } catch (error) {
      console.error("Error getting flow rate:", error);
      return {
        per_second: 0,
        per_minute: 0,
        per_hour: 0,
        per_day: 0,
        per_week: 0,
        per_month: 0,
      };
    }
  };

  // Get flow rate for a stream (fungible asset)
  const getFlowRateFa = async (senderAddress: string, streamId: number): Promise<FlowRate> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_flow_rate_fa` as `${string}::${string}::${string}`,
          functionArguments: [senderAddress, streamId],
        },
      });

      return {
        per_second: response[0] as number,
        per_minute: response[1] as number,
        per_hour: response[2] as number,
        per_day: response[3] as number,
        per_week: response[4] as number,
        per_month: response[5] as number,
      };
    } catch (error) {
      console.error("Error getting flow rate:", error);
      return {
        per_second: 0,
        per_minute: 0,
        per_hour: 0,
        per_day: 0,
        per_week: 0,
        per_month: 0,
      };
    }
  };

  // Get next stream id (coin)
  const getNextStreamIdCoin = async (senderAddress: string, coinType: string): Promise<number> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_next_stream_id_coin` as `${string}::${string}::${string}`,
          typeArguments: [coinType],
          functionArguments: [senderAddress],
        },
      });
      return Number(response[0] ?? 0);
    } catch (error) {
      console.error("Error getting next stream id (coin):", error);
      return 0;
    }
  };

  // Get next stream id (fungible asset)
  const getNextStreamIdFa = async (senderAddress: string): Promise<number> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_next_stream_id_fa` as `${string}::${string}::${string}`,
          functionArguments: [senderAddress],
        },
      });
      return Number(response[0] ?? 0);
    } catch (error) {
      console.error("Error getting next stream id (fa):", error);
      return 0;
    }
  };

  // Get stream details (coin)
  const getStreamDetailsCoin = async (senderAddress: string, streamId: number, coinType: string): Promise<StreamDetails | null> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_stream_details_coin` as `${string}::${string}::${string}`,
          typeArguments: [coinType],
          functionArguments: [senderAddress, streamId],
        },
      });

      return {
        stream_id: response[0] as number,
        sender: response[1] as string,
        recipient: response[2] as string,
        total_amount: response[3] as number,
        withdrawn_amount: response[4] as number,
        start_time: response[5] as number,
        end_time: response[6] as number,
        cliff_timestamp: response[7] as number,
        is_active: response[8] as boolean,
        flow_rate_per_second: response[9] as number,
        asset_type: coinType,
      };
    } catch (error) {
      console.error("Error getting stream details:", error);
      return null;
    }
  };

  // Get stream details (fungible asset)
  const getStreamDetailsFa = async (senderAddress: string, streamId: number): Promise<StreamDetails | null> => {
    try {
      const response = await aptos.view({
        payload: {
          function: `${MONEY_STREAM_CONTRACT_ADDRESS}::money_stream::get_stream_details_fa` as `${string}::${string}::${string}`,
          functionArguments: [senderAddress, streamId],
        },
      });

      return {
        stream_id: response[0] as number,
        sender: response[1] as string,
        recipient: response[2] as string,
        total_amount: response[3] as number,
        withdrawn_amount: response[4] as number,
        start_time: response[5] as number,
        end_time: response[6] as number,
        cliff_timestamp: response[7] as number,
        is_active: response[8] as boolean,
        flow_rate_per_second: response[9] as number,
        asset_type: "Fungible Asset",
      };
    } catch (error) {
      console.error("Error getting stream details:", error);
      return null;
    }
  };

  // Fetch streams when wallet connects or network changes
  useEffect(() => {
    if (connected && account) {
      fetchUserStreams();
    }
  }, [connected, account, network]);

  return {
    streams,
    incomingStreams,
    isLoading,
    isSubmitting,
    fetchUserStreams,
    initializeHubCoin,
    createStreamCoin,
    createStreamByRateCoin,
    initializeHubFa,
    createStreamFa,
    createStreamByRateFa,
    withdrawFromStreamCoin,
    withdrawFromStreamFa,
    pauseStreamCoin,
    pauseStreamFa,
    resumeStreamCoin,
    resumeStreamFa,
    cancelStreamCoin,
    cancelStreamFa,
    getClaimableAmountCoin,
    getClaimableAmountFa,
    getFlowRateCoin,
    getFlowRateFa,
    getNextStreamIdCoin,
    getNextStreamIdFa,
    getStreamDetailsCoin,
    getStreamDetailsFa,
  };
};
