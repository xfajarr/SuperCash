import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Play, Pause, Square, Radio, Share2, Copy, ArrowRight } from "lucide-react";
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
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNetwork } from "@/contexts/NetworkContext";
import { CURRENT_TOKENS } from "@/config/constants";
import { StreamingOdometer } from "@/components/StreamingOdometer";
import { useMoneyStream, StreamDetails } from "@/hooks/useMoneyStream";

// Helper function to format date for datetime-local input
const formatDateTimeLocal = (timestamp: number): string => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};


const Streaming = () => {
  const [recipient, setRecipient] = useState("");
  const [flowRate, setFlowRate] = useState("");
  const [duration, setDuration] = useState("hour");
  const [totalAmount, setTotalAmount] = useState("");
  const [startTime, setStartTime] = useState<number | null>(Math.floor(Date.now() / 1000) + 3600); // Default to 1 hour from now
  const [endTime, setEndTime] = useState<number | null>(Math.floor(Date.now() / 1000) + 7200); // Default to 2 hours from now
  const [cliffDuration, setCliffDuration] = useState("0");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);
  const [shareLink, setShareLink] = useState("");
  const [streamId, setStreamId] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const { account, connected } = useWallet();
  const { network, networkConfig, tokens } = useNetwork();
  const {
    createStreamCoin,
    createStreamByRateCoin,
    createStreamFa,
    createStreamByRateFa,
    pauseStreamCoin,
    pauseStreamFa,
    resumeStreamCoin,
    resumeStreamFa,
    cancelStreamCoin,
    cancelStreamFa,
    withdrawFromStreamCoin,
    withdrawFromStreamFa,
    streams,
    incomingStreams,
    isSubmitting,
    isLoading,
    getFlowRateCoin,
    getFlowRateFa,
    getClaimableAmountCoin,
    getClaimableAmountFa,
    getStreamDetailsCoin,
    getStreamDetailsFa,
    getNextStreamIdCoin,
    getNextStreamIdFa,
    fetchUserStreams
  } = useMoneyStream();


  // Auto-refresh streams
  useEffect(() => {
    if (connected && account) {
      fetchUserStreams();
    }
  }, [connected, account, fetchUserStreams]);

  const startStream = async () => {
    if (!recipient || !flowRate || !totalAmount) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const token = tokens[selectedToken];
      
      // Map duration to interval unit constants from the smart contract
      let intervalUnit;
      switch (duration) {
        case "second":
          intervalUnit = 1; // UNIT_HOUR (but actually second)
          break;
        case "minute":
          intervalUnit = 1; // UNIT_HOUR
          break;
        case "hour":
          intervalUnit = 1; // UNIT_HOUR
          break;
        case "day":
          intervalUnit = 2; // UNIT_DAY
          break;
        case "week":
          intervalUnit = 3; // UNIT_WEEK
          break;
        case "month":
          intervalUnit = 4; // UNIT_MONTH
          break;
        default:
          intervalUnit = 1; // Default to hour
      }
      
      // Calculate duration in seconds based on the selected duration unit
      const durationValue = parseFloat(totalAmount);
      let durationSeconds;
      
      switch (duration) {
        case "second":
          durationSeconds = durationValue;
          break;
        case "minute":
          durationSeconds = durationValue * 60;
          break;
        case "hour":
          durationSeconds = durationValue * 3600;
          break;
        case "day":
          durationSeconds = durationValue * 86400;
          break;
        case "week":
          durationSeconds = durationValue * 604800;
          break;
        case "month":
          durationSeconds = durationValue * 2592000; // 30 days
          break;
        default:
          durationSeconds = durationValue * 3600; // Default to hours
      }
      
      // Amount per interval in the smallest unit
      // Convert flow rate to amount per interval based on the duration unit
      let secondsPerInterval;
      switch (duration) {
        case "second":
          secondsPerInterval = 1;
          break;
        case "minute":
          secondsPerInterval = 60;
          break;
        case "hour":
          secondsPerInterval = 3600;
          break;
        case "day":
          secondsPerInterval = 86400;
          break;
        case "month":
          secondsPerInterval = 2592000; // 30 days
          break;
        default:
          secondsPerInterval = 3600; // Default to hours
      }
      
      // Calculate amount per interval: flow rate (per interval) in the smallest unit
      const amountPerInterval = parseFloat(flowRate) * Math.pow(10, token.decimals);
      
      let result;
      if (token.metadataAddress) {
        // Use fungible asset
        result = await createStreamByRateFa(
          recipient,
          token.metadataAddress,
          amountPerInterval,
          intervalUnit,
          durationSeconds,
          0 // Cliff duration set to 0
        );
      } else {
        // Use coin
        result = await createStreamByRateCoin(
          recipient,
          amountPerInterval,
          intervalUnit,
          durationSeconds,
          0, // Cliff duration set to 0
          token.type
        );
      }

      if (result.success) {
        setIsStreaming(true);
        setTotalStreamed(0);
        setStreamStartTime(Date.now());
        
        // Generate share link for recipient
        const link = `supercash.money/claim-stream?rate=${flowRate}&duration=${duration}&from=${recipient.slice(0, 10)}&total=${totalAmount}`;
        setShareLink(link);

        // Derive the created stream id: next_stream_id - 1
        const senderAddr = account?.address.toString() || "";
        let createdId: number | null = null;
        try {
          // small delay to allow indexers/fullnode write to settle
          await new Promise((r) => setTimeout(r, 1200));
          if (token.metadataAddress) {
            const nextId = await getNextStreamIdFa(senderAddr);
            createdId = Math.max(0, Number(nextId) - 1);
          } else {
            const nextId = await getNextStreamIdCoin(senderAddr, token.type);
            createdId = Math.max(0, Number(nextId) - 1);
          }
        } catch (e) {
          console.error("Error deriving new stream id:", e);
        }

        if (createdId !== null) {
          setStreamId(createdId);
          // Try to fetch stream details with small retries until visible
          const tryFetch = async (retries = 5) => {
            for (let i = 0; i < retries; i++) {
              try {
                let details: StreamDetails | null = null;
                if (token.metadataAddress) {
                  details = await getStreamDetailsFa(senderAddr, createdId!);
                } else {
                  details = await getStreamDetailsCoin(senderAddr, createdId!, token.type);
                }
                if (details) {
                  setStreamDetails(details);
                  return;
                }
              } catch (err) {
                // ignore and retry
              }
              await new Promise((r) => setTimeout(r, 400));
            }
          };
          tryFetch();
        }
        
        toast.success("Payment stream started!");
      }
    } catch (error) {
      console.error("Error creating stream:", error);
      toast.error("Failed to create stream");
    }
  };
  
  // Helper function to get seconds per interval
  const getSecondsPerInterval = (interval: string): number => {
    switch (interval) {
      case "second":
        return 1;
      case "minute":
        return 60;
      case "hour":
        return 3600;
      case "day":
        return 86400;
      case "week":
        return 604800;
      case "month":
        return 2592000; // 30 days
      default:
        return 3600; // Default to hour
    }
  };

  const pauseStream = async () => {
    if (streamId === null) return;
    
    try {
      const token = tokens[selectedToken];
      let result;
      
      if (token.metadataAddress) {
        result = await pauseStreamFa(streamId);
      } else {
        result = await pauseStreamCoin(streamId, token.type);
      }

      if (result.success) {
        setIsPaused(true);
        toast.success("Payment stream paused");
      }
    } catch (error) {
      console.error("Error pausing stream:", error);
      toast.error("Failed to pause stream");
    }
  };

  const resumeStream = async () => {
    if (streamId === null) return;
    
    try {
      const token = tokens[selectedToken];
      let result;
      
      if (token.metadataAddress) {
        result = await resumeStreamFa(streamId);
      } else {
        result = await resumeStreamCoin(streamId, token.type);
      }

      if (result.success) {
        setIsPaused(false);
        toast.success("Payment stream resumed");
      }
    } catch (error) {
      console.error("Error resuming stream:", error);
      toast.error("Failed to resume stream");
    }
  };

  const stopStream = async () => {
    if (streamId === null || !account) return;
    
    try {
      const token = tokens[selectedToken];
      let result;
      
      if (token.metadataAddress) {
        result = await cancelStreamFa(account.address.toString(), streamId);
      } else {
        result = await cancelStreamCoin(account.address.toString(), streamId, token.type);
      }

      if (result.success) {
        setIsStreaming(false);
        setIsPaused(false);
        setTotalStreamed(0);
        setStreamStartTime(null);
        setShareLink("");
        setStreamId(null);
        toast.success("Payment stream stopped");
      }
    } catch (error) {
      console.error("Error stopping stream:", error);
      toast.error("Failed to stop stream");
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Stream link copied! Share it with the recipient");
  };

  const calculateTotal = () => {
    if (!flowRate || !totalAmount) return "0.00";
    const rate = parseFloat(flowRate);
    const durationValue = parseFloat(totalAmount);
    
    // Calculate total based on rate and duration
    return (rate * durationValue).toFixed(2);
  };

  // Real-time streaming effect using smart contract data
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let animationFrameId: number;
    
    if (isStreaming && !isPaused && streamDetails) {
      // Calculate the initial elapsed time based on stream start time
      const now = Date.now();
      const startTimeMs = streamDetails.start_time * 1000; // Convert to milliseconds
      const elapsedSeconds = Math.max(0, (now - startTimeMs) / 1000);
      
      // Calculate the initial streamed amount
      const initialStreamed = Math.min(
        streamDetails.flow_rate_per_second * elapsedSeconds,
        streamDetails.total_amount
      );
      setTotalStreamed(initialStreamed);
      
      // Update every millisecond for superfluid effect
      let lastUpdateTime = now;
      let currentStreamed = initialStreamed;
      
      const updateStreamedAmount = () => {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTime) / 1000; // Convert to seconds
        
        if (streamDetails.is_active) {
          // Calculate the amount to add based on flow rate and time elapsed
          const increment = streamDetails.flow_rate_per_second * deltaTime;
          currentStreamed = Math.min(
            currentStreamed + increment,
            streamDetails.total_amount
          );
          
          setTotalStreamed(currentStreamed);
        }
        
        lastUpdateTime = now;
        
        // Continue the animation
        if (isStreaming && !isPaused && currentStreamed < streamDetails.total_amount) {
          animationFrameId = requestAnimationFrame(updateStreamedAmount);
        }
      };
      
      // Start the animation loop
      animationFrameId = requestAnimationFrame(updateStreamedAmount);
      
      // Also fetch claimable amount from smart contract every second
      intervalId = setInterval(async () => {
        if (streamId && account) {
          try {
            let claimableAmount;
            if (tokens[selectedToken].metadataAddress) {
              claimableAmount = await getClaimableAmountFa(account.address.toString(), streamId);
            } else {
              claimableAmount = await getClaimableAmountCoin(
                account.address.toString(),
                streamId,
                tokens[selectedToken].type
              );
            }
            
            // Update with the actual claimable amount from the contract
            setTotalStreamed(claimableAmount);
          } catch (error) {
            console.error("Error fetching claimable amount:", error);
          }
        }
      }, 1000); // Fetch every second
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isStreaming, isPaused, streamDetails, streamId, account, selectedToken, tokens, getClaimableAmountFa, getClaimableAmountCoin]);

  const calculateEndTime = () => {
    if (!startTime || !totalAmount || !flowRate) return null;
    
    const total = parseFloat(totalAmount);
    const rate = parseFloat(flowRate);
    
    // Convert duration to seconds
    let durationInSeconds;
    
    switch (duration) {
      case "second":
        durationInSeconds = 1;
        break;
      case "minute":
        durationInSeconds = 60;
        break;
      case "hour":
        durationInSeconds = 3600;
        break;
      case "day":
        durationInSeconds = 86400;
        break;
      case "month":
        durationInSeconds = 2628000;
        break;
      default:
        durationInSeconds = 3600;
    }
    
    const totalDuration = (total / rate) * durationInSeconds;
    return startTime + totalDuration;
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Money Streaming</h1>
            <p className="text-xl text-muted-foreground">
              Stream payments continuously to anyone
            </p>
          </div>

          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="create" className="rounded-lg">Create Stream</TabsTrigger>
              <TabsTrigger value="incoming" className="rounded-lg">Incoming</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Create Stream</h2>
            </div>

            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Recipient Address</label>
                  <Input
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="rounded-xl border-2"
                    disabled={isStreaming}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Token</label>
                  <Select value={selectedToken} onValueChange={setSelectedToken} disabled={isStreaming}>
                    <SelectTrigger className="w-full rounded-xl border-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-2">
                      {Object.keys(tokens).map((token) => (
                        <SelectItem key={token} value={token} className="rounded-lg">
                          {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Total Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="text-xl font-bold rounded-xl border-2"
                    disabled={isStreaming}
                  />
                </div>

                <Button
                  onClick={() => setCurrentStep(2)}
                  disabled={!recipient || !totalAmount || !selectedToken}
                  className="w-full rounded-xl font-bold text-lg py-6"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Stream Configuration */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Flow Rate</label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={flowRate}
                      onChange={(e) => setFlowRate(e.target.value)}
                      className="text-xl font-bold rounded-xl border-2 flex-1"
                      disabled={isStreaming}
                    />
                    <Select value={duration} onValueChange={setDuration} disabled={isStreaming}>
                      <SelectTrigger className="w-[120px] rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="second" className="rounded-lg">per Second</SelectItem>
                        <SelectItem value="minute" className="rounded-lg">per Minute</SelectItem>
                        <SelectItem value="hour" className="rounded-lg">per Hour</SelectItem>
                        <SelectItem value="day" className="rounded-lg">per Day</SelectItem>
                        <SelectItem value="month" className="rounded-lg">per Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Duration</label>
                  <div className="flex gap-3">
                    <Input
                      type="number"
                      placeholder="1"
                      value={totalAmount}
                      onChange={(e) => setTotalAmount(e.target.value)}
                      className="text-xl font-bold rounded-xl border-2 flex-1"
                      disabled={isStreaming}
                    />
                    <Select value={duration} onValueChange={setDuration} disabled={isStreaming}>
                      <SelectTrigger className="w-[120px] rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-2">
                        <SelectItem value="second" className="rounded-lg">Seconds</SelectItem>
                        <SelectItem value="minute" className="rounded-lg">Minutes</SelectItem>
                        <SelectItem value="hour" className="rounded-lg">Hours</SelectItem>
                        <SelectItem value="day" className="rounded-lg">Days</SelectItem>
                        <SelectItem value="month" className="rounded-lg">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    variant="outline"
                    className="flex-1 rounded-xl font-bold text-lg py-6"
                  >
                    Back
                  </Button>
                  
                  {isStreaming ? (
                    <div className="flex gap-3 flex-1">
                      {isPaused ? (
                        <Button
                          onClick={resumeStream}
                          className="flex-1 rounded-xl font-bold text-lg py-6"
                        >
                          <Play className="w-5 h-5 mr-2" />
                          Resume
                        </Button>
                      ) : (
                        <Button
                          onClick={pauseStream}
                          variant="secondary"
                          className="flex-1 rounded-xl font-bold text-lg py-6"
                        >
                          <Pause className="w-5 h-5 mr-2" />
                          Pause
                        </Button>
                      )}
                      <Button
                        onClick={stopStream}
                        variant="destructive"
                        className="flex-1 rounded-xl font-bold text-lg py-6"
                      >
                        <Square className="w-5 h-5 mr-2" />
                        Stop
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={startStream}
                      disabled={!flowRate || !totalAmount}
                      className="flex-1 rounded-xl font-bold text-lg py-6"
                    >
                      Create Money Stream
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-bold text-xl">{calculateTotal()} {selectedToken}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-bold text-primary">$0.00</span>
              </div>
            </div>
          </Card>

          {/* Active Streams */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Active Streams</h3>
            {!isStreaming ? (
              <Card className="p-8 rounded-2xl border-2 text-center">
                <p className="text-muted-foreground">No active streams</p>
              </Card>
            ) : (
              <Card className="p-6 rounded-2xl border-2 border-primary bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
                    <span className="font-bold">{isPaused ? 'Paused' : 'Live Stream'}</span>
                  </div>
                  <div className="flex gap-2">
                    {isPaused ? (
                      <Button 
                        onClick={resumeStream}
                        size="sm"
                        className="rounded-lg"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button 
                        onClick={pauseStream}
                        size="sm"
                        variant="secondary"
                        className="rounded-lg"
                      >
                        <Pause className="w-4 h-4 mr-1" />
                        Pause
                      </Button>
                    )}
                    <Button 
                      onClick={stopStream}
                      size="sm"
                      variant="destructive"
                      className="rounded-lg"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Stop
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Real-time streaming amount */}
                  <div className="p-6 bg-background rounded-xl border-2 border-border text-center">
                    <p className="text-sm text-muted-foreground mb-3">Total Streamed</p>
                    <div className="flex flex-col items-center justify-center">
                      <StreamingOdometer
                        value={totalStreamed}
                        decimals={2}
                        tokenSymbol={selectedToken}
                        isAnimating={isStreaming && !isPaused}
                        size="lg"
                        streamingRate={(function(){
                          const token = tokens[selectedToken];
                          const dec = token?.decimals ?? 6;
                          if (streamDetails && typeof streamDetails.flow_rate_per_second === 'number') {
                            return Number(streamDetails.flow_rate_per_second) / Math.pow(10, dec);
                          }
                          return flowRate ? (parseFloat(flowRate) / getSecondsPerInterval(duration)) : 0;
                        })()}
                        maxValue={(function(){
                          const token = tokens[selectedToken];
                          const dec = token?.decimals ?? 6;
                          if (streamDetails && typeof streamDetails.total_amount === 'number') {
                            return Number(streamDetails.total_amount) / Math.pow(10, dec);
                          }
                          return parseFloat(calculateTotal());
                        })()}
                        onValueChange={setTotalStreamed}
                      />
                      <div className="mt-3 text-sm text-muted-foreground">
                        {totalStreamed.toFixed(2)} {selectedToken}
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{(() => {
                        const token = tokens[selectedToken];
                        const dec = token?.decimals ?? 6;
                        const total = streamDetails ? (Number(streamDetails.total_amount) / Math.pow(10, dec)) : parseFloat(calculateTotal());
                        return ((totalStreamed / (total || 1)) * 100).toFixed(1) + '% of total amount';
                      })()}</span>
                    </div>
                    <Progress
                      value={(() => {
                        const token = tokens[selectedToken];
                        const dec = token?.decimals ?? 6;
                        const total = streamDetails ? (Number(streamDetails.total_amount) / Math.pow(10, dec)) : parseFloat(calculateTotal());
                        return (totalStreamed / (total || 1)) * 100;
                      })()}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">To</span>
                      <code className="text-xs">{recipient.slice(0, 10)}...{recipient.slice(-8)}</code>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rate</span>
                      <span className="font-bold">{flowRate} {selectedToken}/{duration}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status</span>
                      <span className={`font-bold ${isPaused ? 'text-yellow-500' : 'text-green-500'}`}>
                        {isPaused ? 'Paused' : 'Streaming'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Share link for recipient */}
                {shareLink && (
                  <div className="p-4 bg-background rounded-xl border-2 border-primary space-y-3">
                    <div className="flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">Share with recipient:</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-secondary p-2 rounded-lg border break-all">
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
            )}
          </div>

            </TabsContent>

            <TabsContent value="incoming" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Radio className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Incoming Streams</h2>
                </div>

                {(!connected || !account) ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">Please connect your wallet to view incoming streams</p>
                  </div>
                ) : (
                  <>
                    {isLoading ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">Loading streams...</p>
                      </div>
                    ) : incomingStreams.length === 0 ? (
                      <Card className="p-8 rounded-2xl border-2 text-center">
                        <p className="text-muted-foreground">No incoming streams</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {incomingStreams.map((s, idx) => (
                          <Card key={idx} className="p-4 rounded-xl border">
                            <div className="flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-sm text-muted-foreground">From</span>
                                <span className="font-mono text-sm">{s.sender.slice(0, 10)}...{s.sender.slice(-8)}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">{s.total_amount / Math.pow(10, 6)} {s.asset_type}</div>
                                <div className="text-xs text-muted-foreground">{s.is_active ? 'Active' : 'Paused'}</div>
                              </div>
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                              <StreamingOdometer
                                value={s.withdrawn_amount / Math.pow(10, 6)}
                                decimals={6}
                                tokenSymbol={s.asset_type}
                                isAnimating={s.is_active}
                                size="md"
                                streamingRate={(s.flow_rate_per_second || 0) / Math.pow(10, 6)}
                                maxValue={(s.total_amount || 0) / Math.pow(10, 6)}
                              />
                              <Button
                                size="sm"
                                onClick={async () => {
                                  try {
                                    if (s.asset_type === "Fungible Asset") {
                                      await withdrawFromStreamFa(s.sender, s.stream_id);
                                    } else {
                                      await withdrawFromStreamCoin(s.sender, s.stream_id, s.asset_type);
                                    }
                                    toast.success("Withdrawal successful");
                                  } catch (error) {
                                    console.error("Error withdrawing from stream:", error);
                                    toast.error("Failed to withdraw from stream");
                                  }
                                }}
                                disabled={!s.is_active}
                              >
                                Withdraw
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            </TabsContent>
          </Tabs>
          {/* Use Cases */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">💼</div>
              <h4 className="font-bold mb-1">Salaries</h4>
              <p className="text-xs text-muted-foreground">Pay employees by the second</p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">📱</div>
              <h4 className="font-bold mb-1">Subscriptions</h4>
              <p className="text-xs text-muted-foreground">Continuous service payments</p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">🎮</div>
              <h4 className="font-bold mb-1">Gaming</h4>
              <p className="text-xs text-muted-foreground">Pay as you play models</p>
            </Card>
          </div>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🌊 Real-Time Money Flow</h3>
            <p className="text-muted-foreground">
              Money streaming enables continuous payment flows on Aptos. Recipients see funds accumulate in real-time, every second.
            </p>
          </div>

          {/* Demo Link Banner */}
          <Card className="p-6 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/5 to-primary/10">
            <h3 className="font-bold text-lg mb-2">🎬 Try Demo Stream</h3>
            <p className="text-muted-foreground mb-4">
              Experience receiving a money stream in real-time. Click below to see how it works!
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
