import { useState, useEffect } from "react";
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
  RefreshCw,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAptosWallet } from "@/hooks/useAptosWallet";
import { streamingClient, StreamInfo } from "@/lib/streaming-client";

interface StreamWithDetails {
  address: string;
  info: StreamInfo;
  withdrawable: bigint;
}

type StreamHealth = "healthy" | "warning" | "critical" | "depleted" | "expired";

interface StreamHealthInfo {
  status: StreamHealth;
  daysRemaining: number;
  hoursRemaining: number;
  color: string;
  bgColor: string;
  icon: string;
  message: string;
}

const Streaming = () => {
  const { connected, address, signAndSubmitTransaction } = useAptosWallet();

  // Create stream form states
  const [recipient, setRecipient] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [durationMonths, setDurationMonths] = useState("3");
  const [isCreating, setIsCreating] = useState(false);

  // Active streams
  const [myStreams, setMyStreams] = useState<StreamWithDetails[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Stream share link
  const [shareLink, setShareLink] = useState("");
  const [lastCreatedStream, setLastCreatedStream] = useState<string>("");

  // Top-up modal
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [selectedStream, setSelectedStream] = useState<StreamWithDetails | null>(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isToppingUp, setIsToppingUp] = useState(false);

  // Helper: Calculate stream health
  const getStreamHealth = (stream: StreamWithDetails): StreamHealthInfo => {
    const now = Math.floor(Date.now() / 1000);
    const balance = Number(stream.info.balance); // in micro-USDC (6 decimals)
    const ratePerSecond = Number(stream.info.ratePerSecond) / 1_000_000; // Remove only precision (6), keep micro-USDC

    // Check if expired by time
    if (stream.info.endTime > 0 && now > stream.info.endTime) {
      return {
        status: "expired",
        daysRemaining: 0,
        hoursRemaining: 0,
        color: "text-gray-500",
        bgColor: "bg-gray-500",
        icon: "⏰",
        message: "Stream expired",
      };
    }

    // Check if depleted
    if (balance === 0 || !stream.info.isActive) {
      return {
        status: "depleted",
        daysRemaining: 0,
        hoursRemaining: 0,
        color: "text-red-600",
        bgColor: "bg-red-500",
        icon: "🔴",
        message: "Stream depleted - needs top-up",
      };
    }

    // Calculate time remaining based on balance and rate (both in micro-USDC)
    const secondsRemaining = balance / ratePerSecond;
    const hoursRemaining = secondsRemaining / 3600;
    const daysRemaining = hoursRemaining / 24;

    // Health status based on days remaining
    if (daysRemaining > 30) {
      return {
        status: "healthy",
        daysRemaining,
        hoursRemaining,
        color: "text-green-600",
        bgColor: "bg-green-500",
        icon: "🟢",
        message: `~${Math.floor(daysRemaining)} days remaining`,
      };
    } else if (daysRemaining > 7) {
      return {
        status: "warning",
        daysRemaining,
        hoursRemaining,
        color: "text-yellow-600",
        bgColor: "bg-yellow-500",
        icon: "🟡",
        message: `~${Math.floor(daysRemaining)} days remaining`,
      };
    } else if (daysRemaining > 1) {
      return {
        status: "critical",
        daysRemaining,
        hoursRemaining,
        color: "text-orange-600",
        bgColor: "bg-orange-500",
        icon: "🟠",
        message: `Only ${Math.floor(daysRemaining)} days left!`,
      };
    } else {
      return {
        status: "critical",
        daysRemaining,
        hoursRemaining,
        color: "text-red-600",
        bgColor: "bg-red-500",
        icon: "🔴",
        message: `Only ${Math.floor(hoursRemaining)} hours left!`,
      };
    }
  };

  // Helper: Calculate time extension from top-up amount
  const calculateTimeExtension = (amount: number, stream: StreamWithDetails) => {
    const ratePerSecond = Number(stream.info.ratePerSecond) / 1_000_000; // Remove only precision (6), keep micro-USDC
    const amountInMicroUSDC = amount * 1_000_000; // Convert USDC to micro-USDC
    const secondsExtension = amountInMicroUSDC / ratePerSecond;
    const hoursExtension = secondsExtension / 3600;
    const daysExtension = hoursExtension / 24;

    if (daysExtension >= 1) {
      return `~${Math.floor(daysExtension)} days`;
    } else {
      return `~${Math.floor(hoursExtension)} hours`;
    }
  };

  // Helper: Get monthly rate from stream
  const getMonthlyRate = (stream: StreamWithDetails) => {
    const ratePerSecond = Number(stream.info.ratePerSecond) / 1_000_000_000_000; // Remove precision (6) + USDC decimals (6)
    const monthlyRate = ratePerSecond * 30 * 24 * 60 * 60; // 30 days in seconds
    return monthlyRate.toFixed(2);
  };

  // Initialize sender registry
  const initializeSender = async () => {
    if (!connected || !address) return false;

    try {
      const txPayload = streamingClient.buildInitSenderTransaction(address);
      await signAndSubmitTransaction(txPayload);
      return true;
    } catch (error: any) {
      if (error.message?.includes("EREGISTRY_ALREADY_EXISTS")) {
        return true;
      }
      console.error("Error initializing sender:", error);
      throw error;
    }
  };

  // Load all streams created by the user
  const loadMyStreams = async () => {
    if (!connected || !address) {
      setMyStreams([]);
      return;
    }

    setLoadingStreams(true);
    try {
      const streamAddresses = await streamingClient.getSenderStreams(address);

      if (streamAddresses.length === 0) {
        setMyStreams([]);
        return;
      }

      const streamDetails: StreamWithDetails[] = [];
      for (const streamAddr of streamAddresses) {
        const info = await streamingClient.getStreamInfo(streamAddr);
        const withdrawable = await streamingClient.getWithdrawableAmount(streamAddr);

        if (info) {
          streamDetails.push({
            address: streamAddr,
            info,
            withdrawable,
          });
        }
      }

      streamDetails.sort((a, b) => {
        if (a.info.isActive && !b.info.isActive) return -1;
        if (!a.info.isActive && b.info.isActive) return 1;
        return b.info.startTime - a.info.startTime;
      });

      setMyStreams(streamDetails);
    } catch (error) {
      console.error("Error loading streams:", error);
      toast.error("Failed to load streams");
    } finally {
      setLoadingStreams(false);
    }
  };

  // Refresh stream data
  const refreshStreamData = async () => {
    if (!connected || myStreams.length === 0) return;

    setRefreshing(true);
    try {
      const updatedStreams = await Promise.all(
        myStreams.map(async (stream) => {
          const info = await streamingClient.getStreamInfo(stream.address);
          const withdrawable = await streamingClient.getWithdrawableAmount(stream.address);
          return {
            address: stream.address,
            info: info || stream.info,
            withdrawable,
          };
        })
      );

      setMyStreams(updatedStreams);
    } catch (error) {
      console.error("Error refreshing streams:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Create a new stream
  const createStream = async () => {
    if (!connected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!recipient || !monthlyAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    const amount = parseFloat(monthlyAmount);
    const months = parseInt(durationMonths);

    if (amount <= 0 || isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (months <= 0 || isNaN(months)) {
      toast.error("Please enter a valid duration");
      return;
    }

    setIsCreating(true);

    try {
      toast.info("Initializing sender registry...");
      const initialized = await initializeSender();
      if (!initialized) {
        throw new Error("Failed to initialize sender");
      }

      const streamAddr = await streamingClient.getStreamAddress(address, recipient);

      const existingInfo = await streamingClient.getStreamInfo(streamAddr);
      if (existingInfo && existingInfo.isActive) {
        toast.error("Active stream already exists to this recipient");
        setIsCreating(false);
        return;
      }

      toast.info("Creating payment stream...");
      const txPayload = streamingClient.buildCreateStreamTransaction(
        recipient,
        amount,
        months
      );

      const response = await signAndSubmitTransaction(txPayload);
      const txHash = response.hash;

      toast.success("Stream created successfully!");

      const link = `${window.location.origin}/claim-stream`;
      setShareLink(link);
      setLastCreatedStream(streamAddr);

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

      await loadMyStreams();

      setRecipient("");
      setMonthlyAmount("");
    } catch (error: any) {
      console.error("Error creating stream:", error);

      if (error.message?.includes("INSUFFICIENT_BALANCE")) {
        toast.error(`Insufficient USDC balance. You need ${amount * months} USDC`);
      } else if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error(error.message || "Failed to create stream");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Cancel a stream
  const cancelStream = async (streamAddress: string) => {
    if (!connected) return;

    try {
      toast.info("Cancelling stream...");
      const txPayload = streamingClient.buildCancelStreamTransaction(streamAddress);
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

      await loadMyStreams();
    } catch (error: any) {
      console.error("Error cancelling stream:", error);
      if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error("Failed to cancel stream");
      }
    }
  };

  // Open top-up modal
  const openTopUpModal = (stream: StreamWithDetails) => {
    setSelectedStream(stream);
    setTopUpAmount("");
    setTopUpModalOpen(true);
  };

  // Handle top-up
  const handleTopUp = async () => {
    if (!selectedStream || !topUpAmount) return;

    const amount = parseFloat(topUpAmount);
    if (amount <= 0 || isNaN(amount)) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsToppingUp(true);

    try {
      toast.info("Topping up stream...");
      const txPayload = streamingClient.buildTopUpTransaction(
        selectedStream.address,
        amount
      );
      const response = await signAndSubmitTransaction(txPayload);

      toast.success(`Stream topped up with ${amount} USDC!`);

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

      await loadMyStreams();
      setTopUpModalOpen(false);
      setTopUpAmount("");
    } catch (error: any) {
      console.error("Error topping up stream:", error);
      if (error.message?.includes("INSUFFICIENT_BALANCE")) {
        toast.error(`Insufficient USDC balance. You need ${amount} USDC`);
      } else if (error.message?.includes("User rejected")) {
        toast.error("Transaction cancelled");
      } else {
        toast.error("Failed to top up stream");
      }
    } finally {
      setIsToppingUp(false);
    }
  };

  // Quick top-up amounts
  const quickTopUp = (months: number) => {
    if (!selectedStream) return;
    const monthlyRate = parseFloat(getMonthlyRate(selectedStream));
    const amount = (monthlyRate * months).toFixed(2);
    setTopUpAmount(amount);
  };

  // Copy share link
  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Link copied to clipboard!");
  };

  // Calculate total amount
  const calculateTotal = () => {
    if (!monthlyAmount || !durationMonths) return "0.00";
    const amount = parseFloat(monthlyAmount);
    const months = parseInt(durationMonths);
    return (amount * months).toFixed(2);
  };

  // Initial load
  useEffect(() => {
    if (connected && address) {
      loadMyStreams();
    } else {
      setMyStreams([]);
    }
  }, [connected, address]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!connected || myStreams.length === 0) return;

    const interval = setInterval(() => {
      refreshStreamData();
    }, 5000);

    return () => clearInterval(interval);
  }, [connected, myStreams.length]);

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

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="create" className="rounded-lg">
                Create Stream
              </TabsTrigger>
              <TabsTrigger value="manage" className="rounded-lg">
                My Streams ({myStreams.length})
              </TabsTrigger>
            </TabsList>

            {/* Create Stream Tab */}
            <TabsContent value="create" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Create New Stream</h2>
                </div>

                {!connected && (
                  <Card className="p-6 rounded-2xl border-2 border-primary bg-primary/5">
                    <div className="flex items-center gap-3 mb-4">
                      <Wallet className="w-6 h-6 text-primary" />
                      <h3 className="font-bold text-lg">Wallet Required</h3>
                    </div>
                    <p className="text-muted-foreground">
                      Connect your wallet to create payment streams
                    </p>
                  </Card>
                )}

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
                      disabled={!connected || isCreating}
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
                      disabled={!connected || isCreating}
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
                      disabled={!connected || isCreating}
                    >
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

                  <Button
                    onClick={createStream}
                    disabled={!connected || isCreating}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    {isCreating ? "Creating Stream..." : "Create Stream"}
                  </Button>
                </div>

                <div className="pt-4 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Stream Value</span>
                    <span className="font-bold text-xl">{calculateTotal()} USDC</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Network</span>
                    <span className="font-bold text-primary">Aptos Testnet</span>
                  </div>
                </div>

                {shareLink && (
                  <div className="p-4 bg-primary/5 rounded-xl border-2 border-primary space-y-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Stream Created!</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The recipient can view and claim the stream in the Claim Streams page
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-background p-2 rounded-lg border break-all">
                        {shareLink}
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={copyShareLink}
                        className="rounded-lg flex-shrink-0"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* My Streams Tab */}
            <TabsContent value="manage" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <h2 className="text-2xl font-bold">My Streams</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshStreamData}
                    disabled={refreshing || !connected}
                    className="rounded-lg"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                {!connected && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      Connect your wallet to view your streams
                    </p>
                  </div>
                )}

                {connected && loadingStreams && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading streams...</p>
                  </div>
                )}

                {connected && !loadingStreams && myStreams.length === 0 && (
                  <Card className="p-8 rounded-2xl border-2 text-center">
                    <p className="text-muted-foreground">No streams created yet</p>
                  </Card>
                )}

                {connected && !loadingStreams && myStreams.length > 0 && (
                  <div className="space-y-4">
                    {myStreams.map((stream) => {
                      const health = getStreamHealth(stream);
                      const monthlyRate = getMonthlyRate(stream);

                      return (
                        <Card
                          key={stream.address}
                          className={`p-4 rounded-xl border-2 transition-all ${
                            health.status === "critical" || health.status === "depleted"
                              ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                              : health.status === "warning"
                              ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20"
                              : "hover:border-primary/50"
                          }`}
                        >
                          <div className="space-y-4">
                            {/* Header with Status */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${health.bgColor} ${
                                  stream.info.isActive ? "animate-pulse" : ""
                                }`} />
                                <div>
                                  <p className="font-bold">
                                    {stream.info.isActive ? "Active" : "Inactive"}
                                  </p>
                                  <p className={`text-xs ${health.color} font-medium`}>
                                    {health.icon} {health.message}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Balance</p>
                                <p className="font-bold text-lg">
                                  {streamingClient.formatUSDC(stream.info.balance)} USDC
                                </p>
                              </div>
                            </div>

                            {/* Low Balance Warning */}
                            {health.status === "critical" && stream.info.isActive && (
                              <div className="p-3 bg-orange-100 dark:bg-orange-950/30 rounded-lg border-2 border-orange-300">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                                  <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                                    Low Balance Warning!
                                  </p>
                                </div>
                                <p className="text-xs text-orange-800 dark:text-orange-300">
                                  Stream will deplete soon. Top up to keep payments flowing.
                                </p>
                              </div>
                            )}

                            {/* Depleted Warning */}
                            {health.status === "depleted" && (
                              <div className="p-3 bg-red-100 dark:bg-red-950/30 rounded-lg border-2 border-red-300">
                                <div className="flex items-center gap-2 mb-1">
                                  <AlertTriangle className="w-4 h-4 text-red-600" />
                                  <p className="text-sm font-bold text-red-900 dark:text-red-200">
                                    Stream Depleted!
                                  </p>
                                </div>
                                <p className="text-xs text-red-800 dark:text-red-300">
                                  No funds remaining. Top up now to reactivate and resume payments.
                                </p>
                              </div>
                            )}

                            {/* Stream Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-1 mb-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-muted-foreground text-xs">To</p>
                                </div>
                                <p className="font-mono text-xs font-bold break-all">
                                  {stream.info.recipient.slice(0, 10)}...
                                  {stream.info.recipient.slice(-8)}
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <div className="flex items-center gap-1 mb-1">
                                  <TrendingUp className="w-3 h-3 text-muted-foreground" />
                                  <p className="text-muted-foreground text-xs">Rate</p>
                                </div>
                                <p className="font-bold text-xs">
                                  ${monthlyRate}/month
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <p className="text-muted-foreground text-xs mb-1">Withdrawn</p>
                                <p className="font-bold text-xs">
                                  {streamingClient.formatUSDC(stream.info.totalWithdrawn)} USDC
                                </p>
                              </div>
                              <div className="p-3 bg-background rounded-lg border">
                                <p className="text-muted-foreground text-xs mb-1">Total Deposited</p>
                                <p className="font-bold text-xs">
                                  {streamingClient.formatUSDC(stream.info.totalDeposited)} USDC
                                </p>
                              </div>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-muted-foreground text-xs">Started</span>
                                </div>
                                <span className="font-medium text-xs">
                                  {new Date(stream.info.startTime * 1000).toLocaleDateString()}
                                </span>
                              </div>
                              {stream.info.endTime > 0 && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-muted-foreground text-xs">Ends</span>
                                  </div>
                                  <span className="font-medium text-xs">
                                    {new Date(stream.info.endTime * 1000).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-2">
                              {health.status === "depleted" ? (
                                <Button
                                  onClick={() => openTopUpModal(stream)}
                                  className="flex-1 rounded-lg font-semibold"
                                  variant="default"
                                >
                                  <TrendingUp className="w-4 h-4 mr-1" />
                                  Reactivate Stream
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    onClick={() => openTopUpModal(stream)}
                                    className="flex-1 rounded-lg"
                                    variant={health.status === "critical" ? "default" : "outline"}
                                  >
                                    <TrendingUp className="w-4 h-4 mr-1" />
                                    Top Up
                                  </Button>
                                  {stream.info.isActive && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => cancelStream(stream.address)}
                                      className="rounded-lg"
                                    >
                                      <Square className="w-4 h-4 mr-1" />
                                      Cancel
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

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
              Money streaming enables continuous payment flows on Aptos. Recipients see
              funds accumulate in real-time, every second. Built on LayerZero USDC for
              maximum compatibility.
            </p>
          </div>
        </div>
      </div>

      {/* Top-Up Modal */}
      <Dialog open={topUpModalOpen} onOpenChange={setTopUpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Stream</DialogTitle>
            <DialogDescription>
              Add more USDC to extend your payment stream
            </DialogDescription>
          </DialogHeader>

          {selectedStream && (
            <div className="space-y-4 py-4">
              {/* Current Stream Info */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-bold">
                    {streamingClient.formatUSDC(selectedStream.info.balance)} USDC
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Rate</span>
                  <span className="font-bold">${getMonthlyRate(selectedStream)}</span>
                </div>
                {selectedStream.info.isActive && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time Remaining</span>
                    <span className="font-bold text-orange-600">
                      {getStreamHealth(selectedStream).message}
                    </span>
                  </div>
                )}
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <label className="text-sm font-medium mb-2 block">Quick Amounts</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickTopUp(1)}
                    className="rounded-lg"
                  >
                    1 Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickTopUp(3)}
                    className="rounded-lg"
                  >
                    3 Months
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => quickTopUp(6)}
                    className="rounded-lg"
                  >
                    6 Months
                  </Button>
                </div>
              </div>

              {/* Custom Amount Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Top-Up Amount (USDC)
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  className="text-lg font-bold rounded-xl border-2"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Time Extension Preview */}
              {topUpAmount && parseFloat(topUpAmount) > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="font-medium">
                      This will add approximately{" "}
                      <span className="font-bold text-primary">
                        {calculateTimeExtension(parseFloat(topUpAmount), selectedStream)}
                      </span>{" "}
                      to your stream
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTopUpModalOpen(false)}
              disabled={isToppingUp}
              className="rounded-lg"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTopUp}
              disabled={!topUpAmount || parseFloat(topUpAmount) <= 0 || isToppingUp}
              className="rounded-lg"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {isToppingUp ? "Topping Up..." : "Confirm Top-Up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default Streaming;
