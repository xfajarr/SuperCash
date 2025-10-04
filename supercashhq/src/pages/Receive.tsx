import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Copy, QrCode, Link2, Check, Send, Radio } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
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

const Receive = () => {
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const { account, connected } = useWallet();
  
  const walletAddress = useMemo(() => {
    return account?.address ? account.address.toString() : "";
  }, [account?.address]);
  
  const paymentLink = useMemo(() => {
    return walletAddress ? `supercash.money/pay/${walletAddress}${amount ? `?amount=${amount}&token=${selectedToken}` : ''}` : "";
  }, [walletAddress, amount, selectedToken]);
  
  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopiedAddress(true);
    toast.success("Address copied to clipboard!");
    setTimeout(() => setCopiedAddress(false), 2000);
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(paymentLink);
    setCopiedLink(true);
    toast.success("Payment link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };
  
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Receive Payments</h1>
            <p className="text-xl text-muted-foreground">
              Share your address or create a payment request
            </p>
          </div>

          <Tabs defaultValue="address" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="address" className="rounded-lg">My Address</TabsTrigger>
              <TabsTrigger value="request" className="rounded-lg">Request Payment</TabsTrigger>
            </TabsList>

            {/* Address Tab */}
            <TabsContent value="address" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Your Wallet</h2>
                </div>

                {connected && walletAddress ? (
                  <>
                    {/* QR Code */}
                    <div className="flex justify-center py-6">
                      <div className="p-6 bg-background rounded-2xl border-2 border-border">
                        <QRCodeSVG
                          value={walletAddress}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Wallet Address</label>
                      <div className="flex gap-2">
                        <Input
                          value={walletAddress}
                          readOnly
                          className="rounded-xl border-2 bg-muted font-mono text-sm"
                        />
                        <Button
                          onClick={copyAddress}
                          variant="outline"
                          size="icon"
                          className="rounded-xl border-2 flex-shrink-0"
                        >
                          {copiedAddress ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-secondary rounded-xl border-2 border-border">
                      <p className="text-sm text-muted-foreground">
                        Share this address to receive any supported token on SuperCash
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Please connect your wallet to view your address</p>
                    <p className="text-sm text-muted-foreground">Your wallet address and QR code will appear here once connected</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Request Payment Tab */}
            <TabsContent value="request" className="space-y-6">
              <Card className="p-6 space-y-6 rounded-2xl border-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-2xl font-bold">Payment Request</h2>
                </div>

                {connected && walletAddress ? (
                  <>
                    {/* Amount Input */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Amount (Optional)</label>
                      <div className="flex gap-3">
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="text-2xl font-bold rounded-xl border-2 flex-1"
                        />
                        <Select value={selectedToken} onValueChange={setSelectedToken}>
                          <SelectTrigger className="w-[130px] rounded-xl border-2">
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

                    {/* QR Code for Payment Link */}
                    <div className="flex justify-center py-6">
                      <div className="p-6 bg-background rounded-2xl border-2 border-border">
                        <QRCodeSVG
                          value={paymentLink}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>

                    {/* Payment Link */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Payment Link</label>
                      <div className="flex gap-2">
                        <Input
                          value={paymentLink}
                          readOnly
                          className="rounded-xl border-2 bg-muted text-sm"
                        />
                        <Button
                          onClick={copyLink}
                          variant="outline"
                          size="icon"
                          className="rounded-xl border-2 flex-shrink-0"
                        >
                          {copiedLink ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="p-4 bg-secondary rounded-xl border-2 border-border">
                      <p className="text-sm text-muted-foreground">
                        Share this link or QR code with anyone to request a payment. They can scan it or click the link to send you funds instantly.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">Please connect your wallet to create payment requests</p>
                    <p className="text-sm text-muted-foreground">Your payment links and QR codes will appear here once connected</p>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🔒 Secure & Private</h3>
            <p className="text-muted-foreground">
              Your wallet address is public by design on blockchain, but your balance and transaction history remain private unless you choose to share them.
            </p>
          </div>

          {/* Related Features */}
          <Card className="p-6 rounded-2xl border-2">
            <h3 className="font-bold text-lg mb-4">More Ways to Get Paid</h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/streaming">
                <Button variant="outline" className="w-full rounded-xl h-auto py-4 flex flex-col gap-2">
                  <Radio className="w-5 h-5" />
                  <div className="text-center">
                    <div className="font-bold">Money Streaming</div>
                    <div className="text-xs text-muted-foreground">Get continuous payments</div>
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

export default Receive;
