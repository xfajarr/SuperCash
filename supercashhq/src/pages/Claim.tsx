import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const Claim = () => {
  const [searchParams] = useSearchParams();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // Mock data from URL
  const amount = searchParams.get("amount") || "100.00";
  const token = searchParams.get("token") || "USDC";
  const sender = searchParams.get("from") || "0x1a2b...def12";

  const handleClaim = () => {
    setClaiming(true);
    toast.success("Claiming funds...");
    
    setTimeout(() => {
      setClaimed(true);
      setClaiming(false);
      toast.success("✓ Funds claimed successfully!");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Claim Transfer</h1>
            <p className="text-xl text-muted-foreground">
              Someone sent you money via link!
            </p>
          </div>

          <Card className="p-8 space-y-6 rounded-2xl border-2">
            {!claimed ? (
              <>
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
                    <Gift className="w-8 h-8" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">You're receiving</p>
                  <p className="text-5xl font-bold">{amount} {token}</p>
                  <p className="text-sm text-muted-foreground">From {sender}</p>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    {claiming ? "Claiming..." : "Claim Funds"}
                  </Button>

                  <div className="p-4 bg-secondary rounded-xl border-2 border-border text-center">
                    <p className="text-sm text-muted-foreground">
                      Funds will be transferred to your wallet instantly
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500 text-white flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-green-500">Successfully Claimed!</p>
                  <p className="text-5xl font-bold">{amount} {token}</p>
                  <p className="text-sm text-muted-foreground">Added to your wallet</p>
                </div>

                <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500 text-center">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Transaction completed in &lt;1 second
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">🔗 Link Transfers</h3>
            <p className="text-muted-foreground">
              Link transfers allow anyone to send money without knowing the recipient's wallet address. Just share a link and the funds are claimed instantly!
            </p>
          </div>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Claim;
