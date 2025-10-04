import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowDownUp, Info, Send, Wallet } from "lucide-react";
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

import { useTokenList } from "@/hooks/useTokenList";

const Swap = () => {
  const tokenList = useTokenList();
  
  // Add rates for swap functionality
  const tokensWithRates = tokenList.map(token => ({
    ...token,
    rate: token.symbol === "APT" ? 1 : 12.5
  }));

  const [fromToken, setFromToken] = useState("APT");
  const [toToken, setToToken] = useState("USDC");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");

  const handleSwap = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (value) {
      const fromRate = tokensWithRates.find(t => t.symbol === fromToken)?.rate || 1;
      const toRate = tokensWithRates.find(t => t.symbol === toToken)?.rate || 1;
      const converted = (parseFloat(value) * fromRate / toRate).toFixed(2);
      setToAmount(converted);
    } else {
      setToAmount("");
    }
  };

  const executeSwap = () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    toast.success("Swap initiated! Processing...");
    setTimeout(() => {
      toast.success("✓ Swap complete!");
      setFromAmount("");
      setToAmount("");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Swap Assets</h1>
            <p className="text-xl text-muted-foreground">
              Exchange tokens instantly at the best rates
            </p>
          </div>

          <Card className="p-6 space-y-4 rounded-2xl border-2">
            {/* From Token */}
            <div className="space-y-3">
              <label className="text-sm font-medium">From</label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="text-2xl font-bold rounded-xl border-2 flex-1"
                />
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-[140px] rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {tokensWithRates.map((token) => (
                      <SelectItem 
                        key={token.symbol} 
                        value={token.symbol}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="font-semibold">{token.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Balance: 0.00 {fromToken}
              </p>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center py-2">
              <Button
                size="icon"
                variant="outline"
                onClick={handleSwap}
                className="rounded-full border-2 w-12 h-12 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <ArrowDownUp className="w-5 h-5" />
              </Button>
            </div>

            {/* To Token */}
            <div className="space-y-3">
              <label className="text-sm font-medium">To</label>
              <div className="flex gap-3">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={toAmount}
                  readOnly
                  className="text-2xl font-bold rounded-xl border-2 flex-1 bg-muted"
                />
                <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="w-[140px] rounded-xl border-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    {tokensWithRates.map((token) => (
                      <SelectItem 
                        key={token.symbol} 
                        value={token.symbol}
                        className="rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={token.icon}
                            alt={token.symbol}
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="font-semibold">{token.symbol}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-muted-foreground">
                Balance: 0.00 {toToken}
              </p>
            </div>

            {/* Rate Info */}
            <div className="p-4 bg-secondary rounded-xl border-2 border-border space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Rate</span>
                <span className="font-bold">1 {fromToken} ≈ {toAmount && fromAmount ? (parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4) : '0.00'} {toToken}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Network Fee</span>
                <span className="font-bold text-primary">$0.00</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated Time</span>
                <span className="font-bold">&lt;1 second</span>
              </div>
            </div>

            <Button 
              onClick={executeSwap}
              className="w-full rounded-xl font-bold text-lg py-6"
            >
              Swap Now
            </Button>
          </Card>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary flex gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold mb-1">Best Price Guaranteed</h3>
              <p className="text-sm text-muted-foreground">
                We automatically route your swap through the best liquidity pools on Aptos to ensure you get the optimal exchange rate.
              </p>
            </div>
          </div>

          {/* Related Features */}
          <Card className="p-6 rounded-2xl border-2">
            <h3 className="font-bold text-lg mb-4">What's Next?</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/transfer">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Send className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Send Tokens</div>
                    <div className="text-xs text-muted-foreground">Transfer anywhere</div>
                  </div>
                </Button>
              </Link>
              <Link to="/receive">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Wallet className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Receive More</div>
                    <div className="text-xs text-muted-foreground">Request payments</div>
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

export default Swap;
