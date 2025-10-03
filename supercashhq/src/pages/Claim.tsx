import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Hex, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { useAptosTransaction } from "@/hooks/useAptosTransaction";
import { useAptosTokens } from "@/hooks/useAptosTokens";
import { CONTRACT_ADDRESS } from "@/config/constants";
import { getClaimLinkCoinPayload, getClaimLinkFungibleAssetPayload } from "@/services/aptosService";
import { useNetwork } from "@/contexts/NetworkContext";

const Claim = () => {
  const [searchParams] = useSearchParams();
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [transactionTimeMs, setTransactionTimeMs] = useState<number | null>(null);
  const [isWaitingClaim, setIsWaitingClaim] = useState(false);
  const { account, connected } = useWallet();
  const { executeTransaction } = useAptosTransaction();
  const { network } = useNetwork();
  const tokens = useAptosTokens();

  const sender = useMemo(() => searchParams.get('sender') || searchParams.get('from') || '', [searchParams]);
  const secretHex = useMemo(() => searchParams.get('secret') || '', [searchParams]);
  const asset = useMemo(() => (searchParams.get('asset') || searchParams.get('token') || 'APT').toUpperCase(), [searchParams]);

  const [resolvedAmount, setResolvedAmount] = useState<string>(searchParams.get('amount') || "");
  const [resolvedAsset, setResolvedAsset] = useState<string>(asset);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(false);

  const toHex = (bytes: Uint8Array) => '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const secretBytes = Hex.fromHexString(secretHex).toUint8Array();


  async function fetchLinkInfo() {
    if (!sender || !secretHex) return;
    try {
      setLoadingInfo(true);
      const secretBytes = Hex.fromHexString(secretHex).toUint8Array();
      const hashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);
      const linkHash = new Uint8Array(hashBuffer);
      const hashHex = toHex(linkHash);

      const aptosNetwork = network === "mainnet" ? Network.MAINNET : Network.TESTNET;
      const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));

      if (resolvedAsset === 'APT') {
        const resourceType = `${CONTRACT_ADDRESS}::payments::PaymentHubCoin<${tokens.APT.type}>`;
        const res: any = await aptos.getAccountResource({ accountAddress: sender, resourceType });
        const handle = res.data.link_transfers.handle;
        const valueType = `${CONTRACT_ADDRESS}::payments::LinkTransferCoin<${tokens.APT.type}>`;
        const item: any = await aptos.getTableItem({ handle, data: { key_type: 'vector<u8>', value_type: valueType, key: hashHex } });
        const amt = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
        const display = (amt / Math.pow(10, tokens.APT.decimals)).toFixed(tokens.APT.decimals);
        setResolvedAmount(display);
      } else {
        const resourceType = `${CONTRACT_ADDRESS}::payments::PaymentHubFA`;
        const res: any = await aptos.getAccountResource({ accountAddress: sender, resourceType });
        const handle = res.data.link_transfers.handle;
        const valueType = `${CONTRACT_ADDRESS}::payments::LinkTransferFA`;
        const item: any = await aptos.getTableItem({ handle, data: { key_type: 'vector<u8>', value_type: valueType, key: hashHex } });
        const metadataAddr = (item.metadata_addr as string).toLowerCase();
        let symbol = resolvedAsset;
        let decimals = 6;
        for (const key of Object.keys(tokens)) {
          if (key === 'APT') continue;
          const addr = tokens[key].type.split('::')[0].toLowerCase();
          if (addr === metadataAddr) {
            symbol = key;
            decimals = tokens[key].decimals;
            break;
          }
        }
        const amt = typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount;
        const display = (amt / Math.pow(10, decimals)).toFixed(decimals);
        setResolvedAsset(symbol);
        setResolvedAmount(display);
      }
    } catch (e) {
      console.error('Failed to fetch link info', e);
    } finally {
      setLoadingInfo(false);
    }
  }

  useEffect(() => {
    fetchLinkInfo();
  }, [sender, secretHex, resolvedAsset, network]);

  const handleClaim = async () => {
    if (!connected || !account) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!sender || !secretHex) {
      toast.error('Invalid claim link');
      return;
    }
    setClaiming(true);
    try {
      const secretBytes = Hex.fromHexString(secretHex).toUint8Array();
      const hashBuffer = await crypto.subtle.digest('SHA-256', secretBytes);
      const linkHash = new Uint8Array(hashBuffer);

      const payload = resolvedAsset === 'APT'
        ? getClaimLinkCoinPayload(sender, linkHash, tokens.APT.type)
        : getClaimLinkFungibleAssetPayload(sender, linkHash);

      const aptosNetwork = network === "mainnet" ? Network.MAINNET : Network.TESTNET;
      const aptos = new Aptos(new AptosConfig({ network: aptosNetwork }));

      setIsWaitingClaim(true);
      const startTime = performance.now();
      
      const result = await executeTransaction(payload, {
        successMessage: 'Funds claimed successfully!',
        errorMessage: 'Failed to claim funds',
      });

      if (result.success) {
        const txHash = (result.response as any)?.hash;
        if (txHash) {
          // Wait for transaction finality
          await aptos.waitForTransaction({ transactionHash: txHash });
          const endTime = performance.now();
          setTransactionTimeMs(endTime - startTime);
        }
        setClaimed(true);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to claim funds');
    } finally {
      setIsWaitingClaim(false);
      setClaiming(false);
    }
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
                  <p className="text-5xl font-bold">{resolvedAmount ? `${resolvedAmount} ${resolvedAsset}` : resolvedAsset}</p>
                  <p className="text-sm text-muted-foreground">From {sender ? `${sender.slice(0,10)}...${sender.slice(-6)}` : ''}</p>
                </div>

                <div className="space-y-3">
                  <Button 
                    onClick={handleClaim}
                    disabled={claiming}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    {claiming ? "Claiming..." : "Claim Funds"}
                  </Button>

                  <div className="p-4 bg-secondary rounded-2xl border-2 border-border text-center">
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
                  <p className="text-5xl font-bold">{resolvedAmount ? `${resolvedAmount} ${resolvedAsset}` : resolvedAsset}</p>
                  <p className="text-sm text-muted-foreground">Added to your wallet</p>
                </div>

                <div className="p-4 bg-green-500/10 rounded-2xl border-2 border-green-500 text-center">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Transaction completed in {Math.max(1, Math.round(transactionTimeMs ?? 0))} ms
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">Link Transfers</h3>
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