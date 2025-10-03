import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Link2, Send, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { Hex, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { generateSecretAndHash, convertToSmallestUnit } from "@/utils/helpers";
import { CONTRACT_ADDRESS } from "@/config/constants";
import { useAptosTokens } from "@/hooks/useAptosTokens";
import { useTokenList } from "@/hooks/useTokenList";
import {
  getInstantTransferCoinPayload,
  getInstantTransferFungibleAssetPayload,
  getCreateLinkCoinPayload,
  getCreateLinkFungibleAssetPayload,
  getCancelLinkCoinPayload,
  getCancelLinkFungibleAssetPayload,
} from "@/services/aptosService";
import { useAptosTransaction } from "@/hooks/useAptosTransaction";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useNetwork } from "@/contexts/NetworkContext";


const TransferPage = () => {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [lastLinkHash, setLastLinkHash] = useState<Uint8Array | null>(null);
  const { executeTransaction, isSubmitting, account } = useAptosTransaction();
  const { account: walletAccount } = useWallet();
  const { network } = useNetwork();
  const tokens = useAptosTokens();
  const tokenList = useTokenList();

  const [directTimerMs, setDirectTimerMs] = useState<number | null>(null);
  const [linkTimerMs, setLinkTimerMs] = useState<number | null>(null);
  const [isWaitingDirect, setIsWaitingDirect] = useState(false);
  const [isWaitingLink, setIsWaitingLink] = useState(false);

  const handleGenerateLink = async () => {
    if (!amount) {
      toast.error("Please enter an amount");
      return;
    }
    const tokenInfo = tokens[selectedToken];
    const amountInSmallestUnit = convertToSmallestUnit(
      parseFloat(amount),
      tokenInfo.decimals
    );
    const { secret, hash } = await generateSecretAndHash();

    const payload =
      selectedToken === "APT"
        ? getCreateLinkCoinPayload(amountInSmallestUnit, hash, 86400, tokens.APT.type)
        : getCreateLinkFungibleAssetPayload(
          selectedToken,
          tokenInfo.metadataAddress,
          amountInSmallestUnit,
          hash
        );

    const aptosNetwork = (network === "mainnet") ? Network.MAINNET : Network.TESTNET;
    const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));

    setIsWaitingLink(true);
    const t0l = performance.now();
    const _intl = window.setInterval(() => setLinkTimerMs(performance.now() - t0l), 16);

    const result = await executeTransaction(payload, {
      successMessage: "Payment link created successfully!",
      errorMessage: "Failed to create payment link",
    });

    if (result.success && account) {
      const secretHex = new Hex(secret).toString();
      const origin = window.location.origin;
      const link = `${origin}/claim?sender=${account.address}&secret=${secretHex}&asset=${selectedToken}`;
      setGeneratedLink(link);
      setLastLinkHash(hash);
      setAmount("");

      // Wait for transaction to be confirmed before refreshing links
      try {
        const txHash = (result.response as any)?.hash;
        if (txHash) {
          await aptos.waitForTransaction({ transactionHash: txHash });
          // Refresh my links after transaction is confirmed
          loadMyLinks();
        }
      } catch (e) {
        console.error("Error waiting for transaction confirmation:", e);
        // Still try to refresh links even if confirmation fails
        loadMyLinks();
      }
    }
    window.clearInterval(_intl);
    setLinkTimerMs(performance.now() - t0l);
    setIsWaitingLink(false);
  };

  const handleCancelLink = async () => {
    if (!lastLinkHash) return;
    const payload =
      selectedToken === "APT"
        ? getCancelLinkCoinPayload(lastLinkHash, tokens.APT.type)
        : getCancelLinkFungibleAssetPayload(lastLinkHash);
    const result = await executeTransaction(payload, {
      successMessage: "Link cancelled",
      errorMessage: "Failed to cancel link",
    });
    if (result.success) {
      setGeneratedLink("");
      setLastLinkHash(null);
      loadMyLinks();
      try {
        const aptosNetwork = (network === "mainnet") ? Network.MAINNET : Network.TESTNET;
        const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));
        const txHash = (result.response as any)?.hash;
        if (txHash) {
          await aptos.waitForTransaction({ transactionHash: txHash });
        }
      } catch (e) {
        console.error("Error waiting for transaction confirmation:", e);
      }
    }
    setIsWaitingDirect(false);
  };

  const handleDirectTransfer = async () => {
    if (!amount || !recipient) {
      toast.error("Please fill in all fields");
      return;
    }
    const tokenInfo = tokens[selectedToken];
    const amountInSmallestUnit = convertToSmallestUnit(
      parseFloat(amount),
      tokenInfo.decimals
    );

    if (!account?.address) {
      toast.error("Please connect your wallet first");
      return;
    }

    const payload =
      selectedToken === "APT"
        ? getInstantTransferCoinPayload(recipient, amountInSmallestUnit, tokens.APT.type)
        : getInstantTransferFungibleAssetPayload(
          tokenInfo.type,
          recipient,
          tokenInfo.metadataAddress,
          amountInSmallestUnit
        );

    const aptosNetwork = (network === "mainnet") ? Network.MAINNET : Network.TESTNET;
    const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));

    setIsWaitingDirect(true);
    const t0 = performance.now();
    const _int = window.setInterval(() => setDirectTimerMs(performance.now() - t0), 16);

    const result = await executeTransaction(payload, {
      successMessage: "Transfer complete!",
      errorMessage: "Failed to complete transfer",
    });

    if (result.success) {
      setAmount("");
      setRecipient("");
      try { const txHash = (result.response as any)?.hash; if (txHash) { await aptos.waitForTransaction({ transactionHash: txHash }); } } catch { }
    }
    window.clearInterval(_int);
    setDirectTimerMs(performance.now() - t0);
    setIsWaitingDirect(false);
  };

  const copyLink = () => {
    const textArea = document.createElement("textarea");
    textArea.value = generatedLink;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link.");
    }
    document.body.removeChild(textArea);
  };

  // My Links state and loader
  const [myLinks, setMyLinks] = useState<any[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  async function loadMyLinks() {
    if (!walletAccount?.address) return;
    setLoadingLinks(true);
    try {
      const aptosNetwork = (network === "mainnet") ? Network.MAINNET : Network.TESTNET;
      const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));
      const addr = walletAccount.address.toString();
      const links: any[] = [];

      // Coin hub (APT)
      try {
        const coinResourceType = `${tokens.APT.type}`;
        const hubCoin = `${CONTRACT_ADDRESS}::payments::PaymentHubCoin<${coinResourceType}>`;
        // Fetch events
        const created = (await (aptos as any).getEventsByEventHandle({ accountAddress: addr, eventHandleStruct: hubCoin, fieldName: 'link_created_events' })) as any[];
        const claimed = (await (aptos as any).getEventsByEventHandle({ accountAddress: addr, eventHandleStruct: hubCoin, fieldName: 'link_claimed_events' })) as any[];
        const claimedSet = new Set(claimed.map((e) => (e.data.link_hash as string).toLowerCase()));
        for (const ev of created) {
          const data = ev.data as any;
          const hashHex = (data.link_hash as string).toLowerCase();
          const amt = Number(data.amount);
          const expires_at = Number(data.expires_at);
          const status = claimedSet.has(hashHex)
            ? 'Claimed'
            : Date.now() / 1000 > expires_at
              ? 'Expired'
              : 'Active';
          links.push({
            hashHex,
            token: 'APT',
            amountDisplay: (amt / Math.pow(10, tokens.APT.decimals)).toFixed(tokens.APT.decimals),
            expires_at,
            status,
            isFA: false,
          });
        }
      } catch {
        // Ignore coin hub errors
      }

      // FA hub (USDC/USDT/PYUSD)
      try {
        const hubFA = `${CONTRACT_ADDRESS}::payments::PaymentHubFA`;
        const createdFA = (await (aptos as any).getEventsByEventHandle({ accountAddress: addr, eventHandleStruct: hubFA, fieldName: 'link_created_events' })) as any[];
        const claimedFA = (await (aptos as any).getEventsByEventHandle({ accountAddress: addr, eventHandleStruct: hubFA, fieldName: 'link_claimed_events' })) as any[];
        const claimedSetFA = new Set(claimedFA.map((e) => (e.data.link_hash as string).toLowerCase()));
        for (const ev of createdFA) {
          const data = ev.data as any;
          const hashHex = (data.link_hash as string).toLowerCase();
          const amt = Number(data.amount);
          const expires_at = Number(data.expires_at);
          // Determine symbol by asset_type contents
          let symbol = 'FA';
          const assetType = (data.asset_type as string).toLowerCase();
          for (const key of Object.keys(tokens)) {
            if (key === 'APT') continue;
            const addr0 = tokens[key].type.split('::')[0].toLowerCase();
            if (assetType.includes(addr0)) {
              symbol = key;
              break;
            }
          }
          const decimals = symbol !== 'FA' ? tokens[symbol].decimals : 6;
          const status = claimedSetFA.has(hashHex)
            ? 'Claimed'
            : Date.now() / 1000 > expires_at
              ? 'Expired'
              : 'Active';
          links.push({
            hashHex,
            token: symbol,
            amountDisplay: (amt / Math.pow(10, decimals)).toFixed(decimals),
            expires_at,
            status,
            isFA: true,
          });
        }
      } catch {
        // Ignore FA hub errors
      }

      links.sort((a, b) => b.expires_at - a.expires_at);
      setMyLinks(links);
    } catch (e) {
      console.error('Failed to load links', e);
    } finally {
      setLoadingLinks(false);
    }
  }

  useEffect(() => {
    loadMyLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAccount?.address, network]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold">Send Money</h1>
            <p className="text-xl text-muted-foreground">
              Transfer funds instantly accross Chain and Country
            </p>
          </div>

          <Tabs defaultValue="direct" className="w-full">
            <TabsList className="grid w-full grid-cols-3 rounded-xl p-1 bg-muted">
              <TabsTrigger value="direct" className="rounded-lg">
                Direct Transfer
              </TabsTrigger>
              <TabsTrigger value="link" className="rounded-lg">
                Link Transfer
              </TabsTrigger>
              <TabsTrigger value="my_links" className="rounded-lg">
                My Links
              </TabsTrigger>
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
                    <label className="text-sm font-medium mb-2 block">
                      Amount
                    </label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl font-bold rounded-xl border-2 h-14 flex-1"
                      />
                      <Select
                        value={selectedToken}
                        onValueChange={setSelectedToken}
                      >
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
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Recipient Address
                    </label>
                    <Input
                      placeholder="0x..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      className="rounded-xl border-2"
                    />
                  </div>

                  <Button
                    onClick={handleDirectTransfer}
                    disabled={isSubmitting || !account}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
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
                    <label className="text-sm font-medium mb-2 block">
                      Amount
                    </label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl font-bold rounded-xl border-2 h-14 flex-1"
                      />
                      <Select
                        value={selectedToken}
                        onValueChange={setSelectedToken}
                      >
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
                  </div>

                  <Button
                    onClick={handleGenerateLink}
                    disabled={isSubmitting || !account}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    {isSubmitting ? "Generating..." : "Generate Link"}
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
                      <div className="flex justify-end">
                        <Button
                          variant="destructive"
                          onClick={handleCancelLink}
                          disabled={!lastLinkHash || isSubmitting}
                          className="rounded-xl"
                        >
                          Cancel Link
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="my_links" className="space-y-6">
              <Card className="p-6 space-y-4 rounded-2xl border-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">My Links</h2>
                  <Button variant="outline" onClick={loadMyLinks} className="rounded-xl">
                    Reload
                  </Button>
                </div>
                {loadingLinks ? (
                  <div className="p-8 text-center text-muted-foreground">Loading�</div>
                ) : myLinks.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No links found</div>
                ) : (
                  <div className="space-y-3">
                    {myLinks.map((l, idx) => (
                      <Card key={idx} className="p-4 rounded-xl border">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm text-muted-foreground">{l.token}</div>
                            <div className="font-bold">{l.amountDisplay} {l.token}</div>
                            <div className="text-xs text-muted-foreground">Hash: {l.hashHex.slice(0, 10)}�{l.hashHex.slice(-8)}</div>
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <span className={l.status === 'Claimed' ? 'text-green-600 text-sm' : (l.status === 'Expired' ? 'text-red-600 text-sm' : 'text-amber-600 text-sm')}>{l.status}</span>
                            <Button
                              variant="destructive"
                              disabled={l.status !== 'Active'}
                              className="rounded-xl"
                              onClick={async () => {
                                const hex = l.hashHex.startsWith('0x') ? l.hashHex.slice(2) : l.hashHex;
                                const bytes = new Uint8Array(hex.match(/.{1,2}/g).map((h: string) => parseInt(h, 16)));
                                const payload = l.isFA ? getCancelLinkFungibleAssetPayload(bytes) : getCancelLinkCoinPayload(bytes, tokens.APT.type);
                                await executeTransaction(payload, { successMessage: 'Link cancelled', errorMessage: 'Failed to cancel link' });
                                loadMyLinks();
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
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