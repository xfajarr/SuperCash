import { useState, useEffect } from "react";
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

const Streaming = () => {
  const [recipient, setRecipient] = useState("");
  const [flowRate, setFlowRate] = useState("");
  const [duration, setDuration] = useState("hour");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [totalStreamed, setTotalStreamed] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [shareLink, setShareLink] = useState("");

  // Real-time streaming counter
  useEffect(() => {
    if (!isStreaming || isPaused || !flowRate) return;

    const interval = setInterval(() => {
      const rate = parseFloat(flowRate);
      const perSecond = duration === "hour" 
        ? rate / 3600 
        : duration === "day" 
        ? rate / 86400 
        : rate / 2628000; // month
      
      setTotalStreamed(prev => prev + perSecond);
    }, 1000);

    return () => clearInterval(interval);
  }, [isStreaming, isPaused, flowRate, duration]);

  const startStream = () => {
    if (!recipient || !flowRate) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsStreaming(true);
    setTotalStreamed(0);
    setStreamStartTime(Date.now());
    
    // Generate share link for recipient
    const link = `supercash.app/claim-stream?rate=${flowRate}&duration=${duration}&from=${recipient.slice(0, 10)}&total=${calculateTotal()}`;
    setShareLink(link);
    
    toast.success("Payment stream started!");
  };

  const pauseStream = () => {
    setIsPaused(true);
    toast.success("Payment stream paused");
  };

  const resumeStream = () => {
    setIsPaused(false);
    toast.success("Payment stream resumed");
  };

  const stopStream = () => {
    setIsStreaming(false);
    setIsPaused(false);
    setTotalStreamed(0);
    setStreamStartTime(null);
    setShareLink("");
    toast.success("Payment stream stopped");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast.success("Stream link copied! Share it with the recipient");
  };

  const calculateTotal = () => {
    if (!flowRate) return "0.00";
    const rate = parseFloat(flowRate);
    const multiplier = duration === "hour" ? 1 : duration === "day" ? 24 : 730;
    return (rate * multiplier).toFixed(2);
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

          <Card className="p-6 space-y-6 rounded-2xl border-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Create Stream</h2>
            </div>

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
                      <SelectItem value="hour" className="rounded-lg">per Hour</SelectItem>
                      <SelectItem value="day" className="rounded-lg">per Day</SelectItem>
                      <SelectItem value="month" className="rounded-lg">per Month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {isStreaming ? (
                <div className="flex gap-3">
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
                  className="w-full rounded-xl font-bold text-lg py-6"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Stream
                </Button>
              )}
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Monthly Cost</span>
                <span className="font-bold text-xl">{calculateTotal()} USDC</span>
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
                  <div className="p-4 bg-background rounded-xl border-2 border-border text-center">
                    <p className="text-sm text-muted-foreground mb-1">Total Streamed</p>
                    <p className="text-3xl font-bold text-primary">
                      {totalStreamed.toFixed(6)} USDC
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{((totalStreamed / parseFloat(calculateTotal())) * 100).toFixed(1)}% of monthly estimate</span>
                    </div>
                    <Progress 
                      value={(totalStreamed / parseFloat(calculateTotal())) * 100} 
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
                      <span className="font-bold">{flowRate} USDC/{duration}</span>
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

export default Streaming;
