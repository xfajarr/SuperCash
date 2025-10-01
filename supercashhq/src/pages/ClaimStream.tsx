import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Radio, CheckCircle2, Pause, Play } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useSearchParams } from "react-router-dom";

const ClaimStream = () => {
  const [searchParams] = useSearchParams();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalClaimed, setTotalClaimed] = useState(0);
  const [claimStartTime, setClaimStartTime] = useState<number | null>(null);

  // Mock data from URL
  const flowRate = searchParams.get("rate") || "100.00";
  const duration = searchParams.get("duration") || "hour";
  const sender = searchParams.get("from") || "0x1a2b...def12";
  const totalAmount = parseFloat(searchParams.get("total") || "2400");

  // Real-time streaming counter for recipient
  useEffect(() => {
    if (!isActive || isPaused) return;

    const interval = setInterval(() => {
      const rate = parseFloat(flowRate);
      const perSecond = duration === "hour" 
        ? rate / 3600 
        : duration === "day" 
        ? rate / 86400 
        : rate / 2628000; // month
      
      setTotalClaimed(prev => {
        const newAmount = prev + perSecond;
        // Don't exceed total amount
        return newAmount > totalAmount ? totalAmount : newAmount;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isPaused, flowRate, duration, totalAmount]);

  const handleActivateStream = () => {
    setIsActive(true);
    setClaimStartTime(Date.now());
    toast.success("Stream activated! Funds flowing to your wallet");
  };

  const handlePause = () => {
    setIsPaused(true);
    toast.success("Stream paused");
  };

  const handleResume = () => {
    setIsPaused(false);
    toast.success("Stream resumed");
  };

  const handleClaimAll = () => {
    toast.success(`Claiming ${totalClaimed.toFixed(6)} USDC...`);
    setTimeout(() => {
      toast.success("✓ All funds claimed to your wallet!");
      setIsActive(false);
      setTotalClaimed(0);
    }, 1500);
  };

  const progressPercentage = (totalClaimed / totalAmount) * 100;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Claim Stream</h1>
            <p className="text-xl text-muted-foreground">
              Receive money flowing in real-time
            </p>
          </div>

          {!isActive ? (
            <Card className="p-8 space-y-6 rounded-2xl border-2">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center animate-pulse">
                  <Radio className="w-8 h-8" />
                </div>
              </div>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">Someone is streaming money to you!</p>
                <div className="space-y-2">
                  <p className="text-5xl font-bold text-primary">{flowRate} USDC</p>
                  <p className="text-xl text-muted-foreground">per {duration}</p>
                </div>
                <p className="text-sm text-muted-foreground">From {sender}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-secondary rounded-xl border-2 border-border space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Stream Value</span>
                    <span className="font-bold">{totalAmount.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Rate per Second</span>
                    <span className="font-bold">
                      {duration === "hour" 
                        ? (parseFloat(flowRate) / 3600).toFixed(6)
                        : duration === "day"
                        ? (parseFloat(flowRate) / 86400).toFixed(6)
                        : (parseFloat(flowRate) / 2628000).toFixed(6)
                      } USDC/s
                    </span>
                  </div>
                </div>

                <Button 
                  onClick={handleActivateStream}
                  className="w-full rounded-xl font-bold text-lg py-6"
                >
                  <Radio className="w-5 h-5 mr-2" />
                  Activate Stream
                </Button>

                <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary text-center">
                  <p className="text-sm text-muted-foreground">
                    Funds will flow directly to your wallet every second
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 space-y-6 rounded-2xl border-2 border-primary bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-green-500 animate-pulse'}`} />
                  <span className="font-bold text-lg">{isPaused ? 'Paused' : 'Live Stream Active'}</span>
                </div>
                <div className="flex gap-2">
                  {isPaused ? (
                    <Button 
                      onClick={handleResume}
                      size="sm"
                      className="rounded-lg"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Resume
                    </Button>
                  ) : (
                    <Button 
                      onClick={handlePause}
                      size="sm"
                      variant="secondary"
                      className="rounded-lg"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pause
                    </Button>
                  )}
                </div>
              </div>

              {/* Real-time streaming amount */}
              <div className="p-6 bg-background rounded-xl border-2 border-border text-center space-y-2">
                <p className="text-sm text-muted-foreground">Total Received</p>
                <p className="text-5xl font-bold text-primary animate-pulse">
                  {totalClaimed.toFixed(6)}
                </p>
                <p className="text-lg text-muted-foreground">USDC</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stream Progress</span>
                  <span className="font-bold">{progressPercentage.toFixed(1)}% Complete</span>
                </div>
                <Progress 
                  value={progressPercentage} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 USDC</span>
                  <span>{totalAmount.toFixed(2)} USDC</span>
                </div>
              </div>

              {/* Stream details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-background rounded-xl border-2 border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Flow Rate</p>
                  <p className="text-lg font-bold">{flowRate}</p>
                  <p className="text-xs text-muted-foreground">USDC/{duration}</p>
                </div>
                <div className="p-4 bg-background rounded-xl border-2 border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">From</p>
                  <p className="text-xs font-mono font-bold">{sender}</p>
                </div>
              </div>

              <Button 
                onClick={handleClaimAll}
                className="w-full rounded-xl font-bold text-lg py-6"
                disabled={totalClaimed === 0}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Claim All ({totalClaimed.toFixed(2)} USDC)
              </Button>

              <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500 text-center">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">
                  💰 Money is flowing to your wallet in real-time!
                </p>
              </div>
            </Card>
          )}

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🌊 Real-Time Money Streaming</h3>
            <p className="text-muted-foreground">
              Watch your balance grow every second as money flows directly to your wallet. Pause or claim anytime without interrupting the stream.
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default ClaimStream;
