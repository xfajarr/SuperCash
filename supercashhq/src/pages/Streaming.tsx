import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Play,
  Square,
  Radio,
  Share2,
  Copy,
  ArrowRight,
  Wallet,
  ExternalLink,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { streamingClient, StreamInfo } from "@/lib/streaming-client";

const Streaming = () => {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  const [recipient, setRecipient] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("1");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [streamAddress, setStreamAddress] = useState<string>("");
  const [streamInfo, setStreamInfo] = useState<StreamInfo | null>(null);
  const [withdrawableAmount, setWithdrawableAmount] = useState<bigint>(
    BigInt(0)
  );
  const [shareLink, setShareLink] = useState("");

  // Poll for stream updates when active
  useEffect(() => {
    if (!isStreaming || !streamAddress) return;

    const pollStreamInfo = async () => {
      const info = await streamingClient.getStreamInfo(streamAddress);
      if (info) {
        setStreamInfo(info);

        // If stream is no longer active, stop polling
        if (!info.isActive) {
          setIsStreaming(false);
          toast.info("Stream has ended");
        }
      }

      const withdrawable = await streamingClient.getWithdrawableAmount(
        streamAddress
      );
      setWithdrawableAmount(withdrawable);
    };

    // Poll immediately
    pollStreamInfo();

    // Then poll every 3 seconds
    const interval = setInterval(pollStreamInfo, 3000);

    return () => clearInterval(interval);
  }, [isStreaming, streamAddress]);

  const initializeSender = async () => {
    if (!connected || !address) return false;

    try {
      const txPayload = streamingClient.buildInitSenderTransaction(address);
      await signAndSubmitTransaction(txPayload);
      return true;
    } catch (error: any) {
      // If already initialized, that's fine
      if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
        return true;
      }
      console.error("Error initializing sender:", error);
      return false;
    }
  };

  const startStream = async () => {
    if (!connected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!recipient || !monthlyAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseFloat(monthlyAmount);
    if (amount <= 0 || isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsCreating(true);

    try {
      // Step 1: Initialize sender if needed
      toast.info("Initializing sender registry...");
      const initialized = await initializeSender();
      if (!initialized) {
        throw new Error("Failed to initialize sender");
      }

      // Step 2: Get stream address
      const streamAddr = await streamingClient.getStreamAddress(
        address,
        recipient
      );

      // Step 3: Check if stream already exists
      const existingInfo = await streamingClient.getStreamInfo(streamAddr);
      if (existingInfo && existingInfo.isActive) {
        toast.error("Active stream already exists to this recipient");
        setIsCreating(false);
        return;
      }

      // Step 4: Create stream transaction
      toast.info("Creating payment stream...");
      const duration = parseInt(durationMonths);
      const txPayload = streamingClient.buildCreateStreamTransaction(
        recipient,
        amount,
        duration
      );

      const response = await signAndSubmitTransaction(txPayload);
      const txHash = response.hash;

      toast.success("Stream created successfully!");

      // Step 5: Set up stream state
      setStreamAddress(streamAddr);
      setIsStreaming(true);

      // Generate share link
      const link = `${
        window.location.origin
      }/claim-stream?stream=${streamAddr}&from=${address.slice(0, 10)}`;
      setShareLink(link);

      // Show explorer link
      const explorerUrl = streamingClient.getExplorerUrl(txHash);
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
    } catch (error: any) {
      console.error("Error creating stream:", error);

      if (error.message?.includes("INSUFFICIENT_BALANCE")) {
        toast.error("Insufficient USDC balance");
      } else if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Failed to create stream");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const stopStream = async () => {
    if (!streamAddress || !connected) return;

    try {
      toast.info("Cancelling stream...");
      const txPayload =
        streamingClient.buildCancelStreamTransaction(streamAddress);
      const response = await signAndSubmitTransaction(txPayload);

      toast.success("Stream cancelled! Remaining funds returned.");

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

      // Reset state
      setIsStreaming(false);
      setStreamAddress("");
      setStreamInfo(null);
      setWithdrawableAmount(BigInt(0));
      setShareLink("");
      setRecipient("");
      setMonthlyAmount("");
    } catch (error: any) {
      console.error("Error cancelling stream:", error);
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error("Failed to cancel stream");
      }
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Stream link copied! Share it with the recipient");
  };

  const calculateTotal = () => {
    if (!monthlyAmount || !durationMonths) return "0.00";
    const amount = parseFloat(monthlyAmount);
    const duration = parseInt(durationMonths);
    return (amount * duration).toFixed(2);
  };

  const getStreamedPercentage = () => {
    if (!streamInfo) return 0;
    const total = Number(streamInfo.totalDeposited);
    const streamed =
      Number(withdrawableAmount) + Number(streamInfo.totalWithdrawn);
    if (total === 0) return 0;
    return (streamed / total) * 100;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Money Streaming</h1>
            <p className="text-xl text-muted-foreground">
              Stream USDC continuously to anyone on Aptos
            </p>
          </div>

          {!connected && (
            <Card className="p-6 rounded-2xl border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-3 mb-4">
                <Wallet className="w-6 h-6 text-primary" />
                <h3 className="font-bold text-lg">Wallet Required</h3>
              </div>
              <p className="text-muted-foreground">
                Connect your wallet to create and manage payment streams
              </p>
            </Card>
          )}

          <Card className="p-6 space-y-6 rounded-2xl border-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Create Stream</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Recipient Address
                </label>
                <Input
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="rounded-xl border-2"
                  disabled={isStreaming || !connected}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Monthly Amount (USDC)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(e.target.value)}
                  className="text-xl font-bold rounded-xl border-2"
                  disabled={isStreaming || !connected}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Duration (Months)
                </label>
                <Select
                  value={durationMonths}
                  onValueChange={setDurationMonths}
                  disabled={isStreaming || !connected}>
                  <SelectTrigger className="rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="1" className="rounded-lg">
                      1 Month
                    </SelectItem>
                    <SelectItem value="3" className="rounded-lg">
                      3 Months
                    </SelectItem>
                    <SelectItem value="6" className="rounded-lg">
                      6 Months
                    </SelectItem>
                    <SelectItem value="12" className="rounded-lg">
                      12 Months
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isStreaming ? (
                <Button
                  onClick={stopStream}
                  variant="destructive"
                  className="w-full rounded-xl font-bold text-lg py-6">
                  <Square className="w-5 h-5 mr-2" />
                  Cancel Stream
                </Button>
              ) : (
                <Button
                  onClick={startStream}
                  disabled={!connected || isCreating}
                  className="w-full rounded-xl font-bold text-lg py-6">
                  <Play className="w-5 h-5 mr-2" />
                  {isCreating ? "Creating Stream..." : "Start Stream"}
                </Button>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Total Stream Value
                </span>
                <span className="font-bold text-xl">
                  {calculateTotal()} USDC
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network</span>
                <span className="font-bold text-primary">Aptos Testnet</span>
              </div>
            </div>
          </Card>

          {/* Active Stream Display */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Active Stream</h3>
            {!isStreaming ? (
              <Card className="p-8 rounded-2xl border-2 text-center">
                <p className="text-muted-foreground">No active stream</p>
              </Card>
            ) : (
              <Card className="p-6 rounded-2xl border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold">Live Stream</span>
                  </div>
                  <Button
                    onClick={stopStream}
                    size="sm"
                    variant="destructive"
                    className="rounded-lg">
                    <Square className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Real-time streaming amount */}
                  <div className="p-4 bg-background rounded-xl border-2 border-border text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      Available to Recipient
                    </p>
                    <p className="text-3xl font-bold text-primary">
                      {streamingClient.formatUSDC(withdrawableAmount)} USDC
                    </p>
                  </div>

                  {/* Progress bar */}
                  {streamInfo && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Stream Progress</span>
                        <span>{getStreamedPercentage().toFixed(1)}%</span>
                      </div>
                      <Progress
                        value={getStreamedPercentage()}
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0 USDC</span>
                        <span>
                          {streamingClient.formatUSDC(
                            streamInfo.totalDeposited
                          )}{" "}
                          USDC
                        </span>
                      </div>
                    </div>
                  )}

                  {streamInfo && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-3 bg-background rounded-xl border">
                        <p className="text-muted-foreground text-xs mb-1">To</p>
                        <p className="font-mono text-xs font-bold break-all">
                          {streamInfo.recipient.slice(0, 10)}...
                          {streamInfo.recipient.slice(-8)}
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded-xl border">
                        <p className="text-muted-foreground text-xs mb-1">
                          Rate/Second
                        </p>
                        <p className="font-bold">
                          {(
                            Number(streamInfo.ratePerSecond) / 1_000_000
                          ).toFixed(6)}
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded-xl border">
                        <p className="text-muted-foreground text-xs mb-1">
                          Total Withdrawn
                        </p>
                        <p className="font-bold">
                          {streamingClient.formatUSDC(
                            streamInfo.totalWithdrawn
                          )}{" "}
                          USDC
                        </p>
                      </div>
                      <div className="p-3 bg-background rounded-xl border">
                        <p className="text-muted-foreground text-xs mb-1">
                          Remaining
                        </p>
                        <p className="font-bold">
                          {streamingClient.formatUSDC(streamInfo.balance)} USDC
                        </p>
                      </div>
                    </div>
                  )}

                  {streamInfo && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started</span>
                        <span className="font-medium">
                          {new Date(
                            streamInfo.startTime * 1000
                          ).toLocaleString()}
                        </span>
                      </div>
                      {streamInfo.endTime > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ends</span>
                          <span className="font-medium">
                            {new Date(
                              streamInfo.endTime * 1000
                            ).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Share link for recipient */}
                {shareLink && (
                  <div className="p-4 bg-background rounded-xl border-2 border-primary space-y-3 mt-4">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">
                        Share with recipient:
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-secondary p-2 rounded-lg border break-all">
                        {shareLink}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyShareLink}
                        className="rounded-lg flex-shrink-0">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Use Cases */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">💼</div>
              <h4 className="font-bold mb-1">Salaries</h4>
              <p className="text-xs text-muted-foreground">
                Pay employees by the second
              </p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">📱</div>
              <h4 className="font-bold mb-1">Subscriptions</h4>
              <p className="text-xs text-muted-foreground">
                Continuous service payments
              </p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">🎮</div>
              <h4 className="font-bold mb-1">Gaming</h4>
              <p className="text-xs text-muted-foreground">
                Pay as you play models
              </p>
            </Card>
          </div>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🌊 Real-Time Money Flow</h3>
            <p className="text-muted-foreground">
              Money streaming enables continuous payment flows on Aptos.
              Recipients see funds accumulate in real-time, every second. Built
              on LayerZero USDC for maximum compatibility.
            </p>
          </div>

          {/* Demo Link Banner */}
          <Card className="p-6 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <h3 className="font-bold text-lg mb-2">🎬 Try Demo Stream</h3>
            <p className="text-muted-foreground mb-4">
              Experience receiving a money stream in real-time. Click below to
              see how it works!
            </p>
            <Link to="/claim-stream?rate=100&duration=hour&from=0xdemo&total=2400">
              <Button className="w-full rounded-xl font-bold">
                View Demo Stream
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Streaming;
