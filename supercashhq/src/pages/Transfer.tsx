import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link2, Send, Copy, Radio, Wallet } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tokens = [
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "PYUSD", name: "PayPal USD" },
  { symbol: "USDT", name: "Tether" },
  { symbol: "APT", name: "Aptos" },
];

const Transfer = () => {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");

  const handleGenerateLink = () => {
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }
    const link = `supercash.app/claim/${Math.random().toString(36).substring(7)}`;
    setGeneratedLink(link);
    toast.success("Transfer link generated!");
  };

  const handleDirectTransfer = () => {
    if (!amount || !recipient) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("Transfer initiated! Completing in <1s...");
    setTimeout(() => {
      toast.success("✓ Transfer complete!");
      setAmount("");
      setRecipient("");
    }, 800);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success("Link copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Send Money</h1>
            <p className="text-xl text-muted-foreground">
              Transfer funds instantly with zero fees
            </p>
          </div>

          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="direct" className="rounded-lg">Direct Transfer</TabsTrigger>
              <TabsTrigger value="link" className="rounded-lg">Link Transfer</TabsTrigger>
            </TabsList>

            {/* Direct Transfer Tab */}
            <TabsContent value="direct" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Send className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Direct Transfer</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Amount</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl font-bold rounded-xl border-2 h-14 flex-1"
                      />
                      <Select value={selectedToken} onValueChange={setSelectedToken}>
                        <SelectTrigger className="w-[130px] rounded-xl border-2 h-14">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          {tokens.map((token) => (
                            <SelectItem 
                              key={token.symbol} 
                              value={token.symbol}
                              className="rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-semibold">{token.symbol}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Recipient Address</label>
                    <Input
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="rounded-xl border-2"
                    />
                  </div>

                  <Button 
                    onClick={handleDirectTransfer}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    Send Now
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Transaction Fee</span>
                    <span className="font-bold text-primary">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-bold">&lt;1 second</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Link Transfer Tab */}
            <TabsContent value="link" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Link Transfer</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Amount</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl font-bold rounded-xl border-2 h-14 flex-1"
                      />
                      <Select value={selectedToken} onValueChange={setSelectedToken}>
                        <SelectTrigger className="w-[130px] rounded-xl border-2 h-14">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          {tokens.map((token) => (
                            <SelectItem 
                              key={token.symbol} 
                              value={token.symbol}
                              className="rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-semibold">{token.symbol}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateLink}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    Generate Link
                  </Button>

                  {generatedLink && (
                    <div className="p-4 bg-secondary rounded-xl border-2 border-primary space-y-3">
                      <p className="text-sm font-medium">Share this link:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-background p-2 rounded-lg border break-all">
                          {generatedLink}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={copyLink}
                          className="rounded-lg"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Anyone with the link can claim the funds. No wallet address needed!
                  </p>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">⚡ Instant Settlement</h3>
            <p className="text-muted-foreground">
              All transfers are processed on the Aptos blockchain with sub-second finality. Your recipient gets the funds instantly.
            </p>
          </div>

          {/* Related Features */}
          <Card className="p-6 rounded-2xl border-2">
            <h3 className="font-bold text-lg mb-4">More Ways to Send</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/streaming">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Radio className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Stream Payments</div>
                    <div className="text-xs text-muted-foreground">Continuous money flow</div>
                  </div>
                </Button>
              </Link>
              <Link to="/receive">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Wallet className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Request Payment</div>
                    <div className="text-xs text-muted-foreground">Create payment link</div>
                  </div>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Transfer;
