import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DollarSign, CreditCard, Building2, Check, Send, Wallet } from "lucide-react";
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
  { symbol: "USDC", name: "USD Coin", balance: "1,250.00" },
  { symbol: "PYUSD", name: "PayPal USD", balance: "500.00" },
  { symbol: "USDT", name: "Tether", balance: "750.00" },
  { symbol: "APT", name: "Aptos", balance: "100.00" },
];

const CashOut = () => {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [bankAccount, setBankAccount] = useState("");
  const [debitCard, setDebitCard] = useState("");

  const handleBankCashOut = () => {
    if (!amount || !bankAccount) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("Processing bank transfer...");
    setTimeout(() => {
      toast.success("✓ Cash out initiated! Funds will arrive in 1-2 business days");
      setAmount("");
      setBankAccount("");
    }, 1500);
  };

  const handleCardCashOut = () => {
    if (!amount || !debitCard) {
      toast.error("Please fill in all fields");
      return;
    }
    toast.success("Processing card transfer...");
    setTimeout(() => {
      toast.success("✓ Cash out complete! Funds sent to your card");
      setAmount("");
      setDebitCard("");
    }, 1500);
  };

  const selectedTokenData = tokens.find(t => t.symbol === selectedToken);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Cash Out</h1>
            <p className="text-xl text-muted-foreground">
              Convert your crypto to fiat instantly
            </p>
          </div>

          {/* Balance Card */}
          <Card className="p-6 rounded-2xl border-2 bg-gradient-to-br from-primary/10 to-primary/5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
              <div className="flex items-baseline gap-3">
                <p className="text-4xl font-bold">${selectedTokenData?.balance}</p>
                <p className="text-xl text-muted-foreground">{selectedToken}</p>
              </div>
            </div>
          </Card>

          <Tabs defaultValue="bank" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="bank" className="rounded-lg">Bank Account</TabsTrigger>
              <TabsTrigger value="card" className="rounded-lg">Debit Card</TabsTrigger>
            </TabsList>

            {/* Bank Account Tab */}
            <TabsContent value="bank" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Bank Transfer</h2>
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
                    <label className="text-sm font-medium mb-2 block">Bank Account Number</label>
                    <Input
                      placeholder="Enter account number"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="rounded-xl border-2"
                    />
                  </div>

                  <Button 
                    onClick={handleBankCashOut}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    Transfer to Bank
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-bold text-primary">$0.00</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-bold">1-2 business days</span>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* Debit Card Tab */}
            <TabsContent value="card" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Instant Card Transfer</h2>
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
                    <label className="text-sm font-medium mb-2 block">Debit Card Number</label>
                    <Input
                      placeholder="Enter card number"
                      value={debitCard}
                      onChange={(e) => setDebitCard(e.target.value)}
                      className="rounded-xl border-2"
                    />
                  </div>

                  <Button 
                    onClick={handleCardCashOut}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    Send to Card
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-bold text-primary">1.5%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-muted-foreground">Estimated Time</span>
                    <span className="font-bold">Instant</span>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Supported Methods */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">🏦</div>
              <h4 className="font-bold mb-1">Bank Transfer</h4>
              <p className="text-xs text-muted-foreground">ACH & Wire transfers</p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">💳</div>
              <h4 className="font-bold mb-1">Debit Cards</h4>
              <p className="text-xs text-muted-foreground">Visa & Mastercard</p>
            </Card>
            <Card className="p-4 rounded-xl border-2 text-center">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-bold mb-1">Instant Settle</h4>
              <p className="text-xs text-muted-foreground">Get cash in seconds</p>
            </Card>
          </div>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">💰 Multiple Cash Out Options</h3>
            <p className="text-muted-foreground">
              Convert your crypto to cash using bank transfers or instant debit card transfers. All transactions are secure and compliant with regulations.
            </p>
          </div>

          {/* Related Features */}
          <Card className="p-6 rounded-2xl border-2">
            <h3 className="font-bold text-lg mb-4">Before You Cash Out</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/receive">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Wallet className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Receive Payments</div>
                    <div className="text-xs text-muted-foreground">Build your balance</div>
                  </div>
                </Button>
              </Link>
              <Link to="/transfer">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Send className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Send Money</div>
                    <div className="text-xs text-muted-foreground">Transfer to others</div>
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

export default CashOut;
