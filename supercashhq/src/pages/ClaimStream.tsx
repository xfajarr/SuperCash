import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Radio,
  CheckCircle2,
  Wallet,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { streamingClient, StreamInfo } from "@/lib/streaming-client";

interface StreamWithDetails {
  address: string;
  info: StreamInfo;
  withdrawable: bigint;
}

const ClaimStream = () => {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  const [streams, setStreams] = useState<StreamWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [manualSenderAddress, setManualSenderAddress] = useState("");

  // Fetch all streams for the connected recipient
  const fetchRecipientStreams = async () => {
    if (!connected || !address) return;

    setLoading(true);
    try {
      console.log("Fetching streams for recipient:", address);

      // Get all stream addresses for this recipient
      const streamAddresses = await streamingClient.getRecipientStreams(
        address
      );

      console.log("Found stream addresses:", streamAddresses);

      if (streamAddresses.length === 0) {
        console.log("No streams found for this recipient");
        setStreams([]);
        return;
      }

      // Fetch details for each stream
      const streamDetails: StreamWithDetails[] = [];
      for (const streamAddr of streamAddresses) {
        const info = await streamingClient.getStreamInfo(streamAddr);
        const withdrawable = await streamingClient.getWithdrawableAmount(
          streamAddr
        );

        if (info) {
          streamDetails.push({
            address: streamAddr,
            info,
            withdrawable,
          });
        }
      }

      // Sort: active streams first, then by withdrawable amount
      streamDetails.sort((a, b) => {
        if (a.info.isActive && !b.info.isActive) return -1;
        if (!a.info.isActive && b.info.isActive) return 1;
        return Number(b.withdrawable) - Number(a.withdrawable);
      });

      setStreams(streamDetails);
    } catch (error: any) {
      console.error("Error fetching streams:", error);
      toast.error("Failed to load streams");
    } finally {
      setLoading(false);
    }
  };

  // Refresh withdrawable amounts for all streams
  const refreshWithdrawableAmounts = async () => {
    if (!connected || streams.length === 0) return;

    setRefreshing(true);
    try {
      const updatedStreams = await Promise.all(
        streams.map(async (stream) => {
          const withdrawable = await streamingClient.getWithdrawableAmount(
            stream.address
          );
          const info = await streamingClient.getStreamInfo(stream.address);
          return {
            ...stream,
            withdrawable,
            info: info || stream.info,
          };
        })
      );

      setStreams(updatedStreams);
    } catch (error) {
      console.error("Error refreshing amounts:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial fetch when wallet connects
  useEffect(() => {
    if (connected && address) {
      fetchRecipientStreams();
    } else {
      setStreams([]);
    }
  }, [connected, address]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    if (!connected || streams.length === 0) return;

    const interval = setInterval(() => {
      refreshWithdrawableAmounts();
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, streams.length]);

  // Initialize recipient registry if needed
  const initializeRecipient = async () => {
    if (!connected || !address) return false;

    try {
      const txPayload = streamingClient.buildInitRecipientTransaction(address);
      await signAndSubmitTransaction(txPayload);
      return true;
    } catch (error: any) {
      if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
        return true;
      }
      console.error("Error initializing recipient:", error);
      return false;
    }
  };

  // Manually check for stream from a specific sender
  const handleCheckStreamFromSender = async () => {
    if (!connected || !address || !manualSenderAddress) {
      toast.error("Please enter a sender address");
      return;
    }

    setLoading(true);
    try {
      console.log(
        `Checking for stream from ${manualSenderAddress} to ${address}`
      );

      // Calculate the stream address
      const streamAddress = await streamingClient.getStreamAddress(
        manualSenderAddress,
        address
      );

      console.log("Calculated stream address:", streamAddress);

      // Try to get stream info
      const info = await streamingClient.getStreamInfo(streamAddress);

      if (!info) {
        toast.error("No stream found from this sender");
        return;
      }

      // Get withdrawable amount
      const withdrawable = await streamingClient.getWithdrawableAmount(
        streamAddress
      );

      // Add to streams list
      const newStream: StreamWithDetails = {
        address: streamAddress,
        info,
        withdrawable,
      };

      setStreams((prev) => {
        // Check if already exists
        const exists = prev.find((s) => s.address === streamAddress);
        if (exists) {
          toast.info("Stream already in your list");
          return prev;
        }
        toast.success("Stream found and added!");
        return [...prev, newStream];
      });

      setManualSenderAddress("");
    } catch (error: any) {
      console.error("Error checking stream:", error);
      toast.error("No stream found from this address");
    } finally {
      setLoading(false);
    }
  };

  // Manual initialization with user feedback
  const handleInitializeRegistry = async () => {
    if (!connected || !address) return;

    setInitializing(true);
    try {
      toast.info("Initializing recipient registry...");
      const txPayload = streamingClient.buildInitRecipientTransaction(address);
      const response = await signAndSubmitTransaction(txPayload);

      toast.success("Registry initialized! Now fetching your streams...");

      const explorerUrl = streamingClient.getExplorerUrl(response.hash);
      toast.success(
        <div className="flex items-center gap-2">
          <span>View on Explorer</span>
          <ExternalLink className="w-3 h-3" />
        </div>,
        {
          action: {
            label: "Open",
            onClick: () => window.open(explorerUrl, "_blank"),
          },
        }
      );

      // Fetch streams after initialization
      await fetchRecipientStreams();
    } catch (error: any) {
      console.error("Initialization error:", error);
      if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
        toast.success("Registry already exists! Fetching streams...");
        await fetchRecipientStreams();
      } else if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Failed to initialize registry");
      }
    } finally {
      setInitializing(false);
    }
  };

  // Withdraw from a specific stream
  const handleWithdraw = async (
    streamAddress: string,
    withdrawable: bigint
  ) => {
    if (!connected || withdrawable === BigInt(0)) return;

    setWithdrawing(streamAddress);

    try {
      // Initialize recipient if needed
      await initializeRecipient();

      // Build and submit withdrawal transaction
      toast.info("Processing withdrawal...");
      const txPayload = streamingClient.buildWithdrawTransaction(streamAddress);
      const response = await signAndSubmitTransaction(txPayload);

      toast.success(
        `Withdrawn ${streamingClient.formatUSDC(withdrawable)} USDC!`
      );

      // Show explorer link
      const explorerUrl = streamingClient.getExplorerUrl(response.hash);
      toast.success(
        <div className="flex items-center gap-2">
          <span>View on Explorer</span>
          <ExternalLink className="w-3 h-3" />
        </div>,
        {
          action: {
            label: "Open",
            onClick: () => window.open(explorerUrl, "_blank"),
          },
        }
      );

      // Refresh stream data
      await fetchRecipientStreams();
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Failed to withdraw");
      }
    } finally {
      setWithdrawing(null);
    }
  };

  const getStreamProgress = (stream: StreamWithDetails) => {
    const total = Number(stream.info.totalDeposited);
    const streamed =
      Number(stream.withdrawable) + Number(stream.info.totalWithdrawn);
    if (total === 0) return 0;
    return (streamed / total) * 100;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">My Streams</h1>
            <p className="text-xl text-muted-foreground">
              Receive and claim your incoming payment streams
            </p>
          </div>

          {/* Wallet Connection Prompt */}
          {!connected && (
            <Card className="p-6 rounded-2xl border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-6 h-6 text-primary" />
                <h3 className="font-bold text-lg">Connect Wallet Required</h3>
              </div>
              <p className="text-muted-foreground">
                Connect your wallet to view and claim your incoming payment
                streams
              </p>
            </Card>
          )}

          {/* Loading State */}
          {connected && loading && (
            <Card className="p-8 rounded-2xl border-2 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your streams...</p>
            </Card>
          )}

          {/* No Streams */}
          {connected && !loading && streams.length === 0 && (
            <Card className="p-8 rounded-2xl border-2 space-y-6">
              <div className="text-center">
                <Radio className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                <h3 className="font-bold text-lg mb-2 mt-4">
                  No Streams Found
                </h3>
                <p className="text-muted-foreground">
                  You don't have any incoming payment streams in your registry
                  yet.
                </p>
              </div>

              {/* Manual Stream Finder */}
              <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary text-left space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1">
                    🔍 Find Stream by Sender
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If someone sent you a stream before you initialized, enter
                    their address:
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualSenderAddress}
                    onChange={(e) => setManualSenderAddress(e.target.value)}
                    placeholder="0x... (sender address)"
                    className="flex-1 px-3 py-2 rounded-lg border-2 border-border bg-background text-sm font-mono"
                  />
                  <Button
                    onClick={handleCheckStreamFromSender}
                    disabled={!manualSenderAddress || loading}
                    className="rounded-lg">
                    Find
                  </Button>
                </div>
              </div>

              {/* Initialize Registry Info */}
              <div className="p-4 bg-secondary rounded-xl border-2 border-border text-left space-y-2">
                <p className="text-sm font-semibold">💡 First time here?</p>
                <p className="text-xs text-muted-foreground">
                  Initialize your registry so future streams will automatically
                  appear in your list.
                </p>
                <Button
                  onClick={handleInitializeRegistry}
                  disabled={initializing}
                  variant="outline"
                  className="w-full rounded-lg mt-2">
                  {initializing ? "Initializing..." : "Initialize Registry"}
                </Button>
              </div>

              <div className="p-3 bg-secondary rounded-lg text-xs font-mono break-all text-center">
                <p className="text-muted-foreground mb-1">Your address:</p>
                <p>{address}</p>
              </div>

              <Button
                onClick={fetchRecipientStreams}
                variant="outline"
                className="w-full rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Registry
              </Button>
            </Card>
          )}

          {/* Streams List */}
          {connected && !loading && streams.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold">
                  Active Streams (
                  {streams.filter((s) => s.info.isActive).length})
                </h3>
                <Button
                  onClick={refreshWithdrawableAmounts}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="rounded-lg">
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>

              <div className="space-y-4">
                {streams.map((stream) => (
                  <Card
                    key={stream.address}
                    className={`p-6 rounded-2xl border-2 ${
                      stream.info.isActive
                        ? "border-primary bg-primary/5"
                        : "border-border opacity-75"
                    }`}>
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              stream.info.isActive
                                ? "bg-green-500 animate-pulse"
                                : "bg-gray-500"
                            }`}
                          />
                          <span className="font-bold">
                            {stream.info.isActive
                              ? "Active Stream"
                              : "Ended Stream"}
                          </span>
                        </div>
                        {stream.info.isActive && (
                          <Button
                            onClick={() =>
                              handleWithdraw(
                                stream.address,
                                stream.withdrawable
                              )
                            }
                            disabled={
                              stream.withdrawable === BigInt(0) ||
                              withdrawing === stream.address
                            }
                            size="sm"
                            className="rounded-lg">
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {withdrawing === stream.address
                              ? "Withdrawing..."
                              : "Withdraw"}
                          </Button>
                        )}
                      </div>

                      {/* Withdrawable Amount */}
                      <div className="p-4 bg-background rounded-xl border-2 border-border text-center">
                        <p className="text-sm text-muted-foreground mb-1">
                          Available to Withdraw
                        </p>
                        <p className="text-3xl font-bold text-primary">
                          {streamingClient.formatUSDC(stream.withdrawable)} USDC
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Stream Progress</span>
                          <span>{getStreamProgress(stream).toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={getStreamProgress(stream)}
                          className="h-2"
                        />
                      </div>

                      {/* Stream Details Grid */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-3 bg-background rounded-xl border">
                          <p className="text-muted-foreground text-xs mb-1">
                            From
                          </p>
                          <p className="font-mono text-xs font-bold break-all">
                            {stream.info.sender.slice(0, 10)}...
                            {stream.info.sender.slice(-8)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-xl border">
                          <p className="text-muted-foreground text-xs mb-1">
                            Rate/Second
                          </p>
                          <p className="font-bold">
                            {(
                              Number(stream.info.ratePerSecond) / 1_000_000
                            ).toFixed(6)}
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-xl border">
                          <p className="text-muted-foreground text-xs mb-1">
                            Total Withdrawn
                          </p>
                          <p className="font-bold">
                            {streamingClient.formatUSDC(
                              stream.info.totalWithdrawn
                            )}{" "}
                            USDC
                          </p>
                        </div>
                        <div className="p-3 bg-background rounded-xl border">
                          <p className="text-muted-foreground text-xs mb-1">
                            Remaining Balance
                          </p>
                          <p className="font-bold">
                            {streamingClient.formatUSDC(stream.info.balance)}{" "}
                            USDC
                          </p>
                        </div>
                      </div>

                      {/* Timeline */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Started</span>
                          <span className="font-medium">
                            {new Date(
                              stream.info.startTime * 1000
                            ).toLocaleString()}
                          </span>
                        </div>
                        {stream.info.endTime > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              {stream.info.isActive ? "Ends" : "Ended"}
                            </span>
                            <span className="font-medium">
                              {new Date(
                                stream.info.endTime * 1000
                              ).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Stream Address */}
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">
                          Stream Details
                        </summary>
                        <div className="mt-2 p-2 bg-secondary rounded">
                          <p className="font-mono break-all">
                            {stream.address}
                          </p>
                        </div>
                      </details>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🌊 How It Works</h3>
            <p className="text-muted-foreground">
              Payment streams flow continuously to your wallet. The available
              amount grows every second based on the stream rate. You can
              withdraw anytime - no need to wait for the stream to end!
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ClaimStream;
