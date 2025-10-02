import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link2, Send, Copy, Radio, Wallet } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { Hex } from "@aptos-labs/ts-sdk";
import { generateSecretAndHash, convertToSmallestUnit } from "@/utils/helpers";
import { TOKENS } from "@/config/constants";
import { getInstantTransferCoinPayload, getInstantTransferFungibleAssetPayload, getCreateLinkCoinPayload, getCreateLinkFungibleAssetPayload } from "@/services/aptosService";
import { useAptosTransaction } from "@/hooks/useAptosTransaction";

const tokenList = Object.keys(TOKENS).map(symbol => ({
    symbol,
    name: TOKENS[symbol].name
}));

const TransferPage = () => {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const { executeTransaction, isSubmitting, account } = useAptosTransaction();

  const handleGenerateLink = async () => {
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }
    const tokenInfo = TOKENS[selectedToken];
    const amountInSmallestUnit = convertToSmallestUnit(parseFloat(amount), tokenInfo.decimals);
    const { secret, hash } = await generateSecretAndHash();

    // Extract metadata address from token type
    const metadataAddress = tokenInfo.type.split("::")[0];

    const payload = selectedToken === "APT"
        ? getCreateLinkCoinPayload(amountInSmallestUnit, hash)
        : getCreateLinkFungibleAssetPayload(selectedToken, metadataAddress, amountInSmallestUnit, hash);

    const result = await executeTransaction(payload, {
      successMessage: "Payment link created successfully!",
      errorMessage: "Failed to create payment link",
    });

    if (result.success && account) {
      const secretHex = new Hex(secret).toString();
      const link = `https://supercash.money/claim?sender=${account.address}&secret=${secretHex}&asset=${selectedToken}`;
      setGeneratedLink(link);
      setAmount("");
    }
  };

  const handleDirectTransfer = async () => {
    if (!amount || !recipient) {
      toast.error("Please fill in all fields");
      return;
    }
    const tokenInfo = TOKENS[selectedToken];
    const amountInSmallestUnit = convertToSmallestUnit(parseFloat(amount), tokenInfo.decimals);

    // Extract metadata address from token type
    const metadataAddress = tokenInfo.type.split("::")[0];

    const payload = selectedToken === "APT"
        ? getInstantTransferCoinPayload(recipient, amountInSmallestUnit)
        : getInstantTransferFungibleAssetPayload(selectedToken, metadataAddress, recipient, amountInSmallestUnit);

    const result = await executeTransaction(payload, {
      successMessage: "✓ Transfer complete!",
      errorMessage: "Failed to complete transfer",
    });

    if (result.success) {
      setAmount("");
      setRecipient("");
    }
  };

  const copyLink = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedLink;
    document.body.appendChild(textArea);
    textArea.select();
    try {
        document.execCommand('copy');
        toast.success("Link copied to clipboard!");
    } catch (err) {
        toast.error("Failed to copy link.");
    }
    document.body.removeChild(textArea);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Send Money</h1>
            <p className="text-xl text-muted-foreground">Transfer dana instan bebas biaya</p>
          </div>

          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted">
              <TabsTrigger value="direct" className="rounded-lg">Direct Transfer</TabsTrigger>
              <TabsTrigger value="link" className="rounded-lg">Link Transfer</TabsTrigger>
            </TabsList>

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
                     {tokenList.map((token) => (
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
 
             <Button onClick={handleDirectTransfer} disabled={isSubmitting || !account} className="w-full rounded-xl font-bold text-lg py-6">
               {isSubmitting ? "Processing..." : "Send Now"}
             </Button>
           </div>
         </Card>
            </TabsContent>

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
                     {tokenList.map((token) => (
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
 
             <Button onClick={handleGenerateLink} disabled={isSubmitting || !account} className="w-full rounded-xl font-bold text-lg py-6">
               {isSubmitting ? "Generating..." : "Generate Link"}
             </Button>
 
             {generatedLink && (
               <div className="p-4 bg-secondary rounded-xl border-2 border-primary space-y-3">
                 <p className="text-sm font-medium">Share this link:</p>
                 <div className="flex items-center gap-2">
                   <code className="flex-1 text-sm bg-background p-2 rounded-lg border break-all">
                     {generatedLink}
                   </code>
                   <Button size="icon" variant="ghost" onClick={copyLink} className="rounded-lg">
                     <Copy className="w-4 h-4" />
                   </Button>
                 </div>
               </div>
             )}
           </div>
         </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default TransferPage;

