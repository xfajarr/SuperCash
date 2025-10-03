import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Gift, CheckCircle2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Hex, Aptos, AptosConfig, Network, AccountAddressInput } from "@aptos-labs/ts-sdk";
import { useAptosTransaction } from "@/hooks/useAptosTransaction";
import { useAptosTokens } from "@/hooks/useAptosTokens";
import { CONTRACT_ADDRESS } from "@/config/constants";
import { getClaimLinkCoinPayload, getClaimLinkFungibleAssetPayload } from "@/services/aptosService";
import { useNetwork } from "@/contexts/NetworkContext";

interface LinkTransferCoin {
  amount: string;
}
interface LinkTransferFA {
  amount: string;
  metadata_addr: string;
}

const toHex = (bytes: Uint8Array) => '0x' + Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

const Claim = () => {
  const [searchParams] = useSearchParams();
  const [claimed, setClaimed] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false); // REFACTOR: Merged claiming states
  const [transactionTimeMs, setTransactionTimeMs] = useState<number | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<boolean>(false);

  const { account, connected } = useWallet();
  const { executeTransaction } = useAptosTransaction();
  const { network } = useNetwork();
  const tokens = useAptosTokens();

  const sender = useMemo(() => searchParams.get('sender') || searchParams.get('from') || '', [searchParams]);
  const secretHex = useMemo(() => searchParams.get('secret') || '', [searchParams]);
  const asset = useMemo(() => (searchParams.get('asset') || searchParams.get('token') || 'APT').toUpperCase(), [searchParams]);

  const [resolvedAmount, setResolvedAmount] = useState<string>(searchParams.get('amount') || "");
  const [resolvedAsset, setResolvedAsset] = useState<string>(asset);

  const aptos = useMemo(() => {
    const aptosNetwork = network === "mainnet" ? Network.MAINNET : Network.TESTNET;
    return new Aptos(new AptosConfig({ network: aptosNetwork }));
  }, [network]);

  const linkHash = useMemo(async () => {
    if (!secretHex) return null;
    const secretBytes = Hex.fromHexString(secretHex).toUint8Array();
    const hashBuffer = await crypto.subtle.digest('SHA-256', new ArrayBuffer(secretBytes.buffer.byteLength));
    return new Uint8Array(hashBuffer);
  }, [secretHex]);

  const tokenAddressMap = useMemo(() => {
    const map = new Map<string, { symbol: string; decimals: number; type: string }>();
    for (const symbol in tokens) {
      if (symbol !== 'APT') {
        const address = tokens[symbol].type.split('::')[0].toLowerCase();
        map.set(address, { symbol, ...tokens[symbol] });
      }
    }
    return map;
  }, [tokens]);

  const fetchLinkInfo = useCallback(async () => {
    if (!sender || !secretHex || !tokens.APT) return;

    setLoadingInfo(true);
    try {
      const resolvedLinkHash = await linkHash;
      if (!resolvedLinkHash) return;
      const hashHex = toHex(resolvedLinkHash);

      const isAptCoin = asset === 'APT';

      const resourceType = (isAptCoin
        ? `${CONTRACT_ADDRESS}::payments::PaymentHubCoin<${tokens.APT.type}>`
        : `${CONTRACT_ADDRESS}::payments::PaymentHubFA`
      ) as `${string}::${string}::${string}`;

      const valueType = (isAptCoin
        ? `${CONTRACT_ADDRESS}::payments::LinkTransferCoin<${tokens.APT.type}>`
        : `${CONTRACT_ADDRESS}::payments::LinkTransferFA`
      ) as `${string}::${string}::${string}`;

      const resource = await aptos.getAccountResource({ accountAddress: sender as AccountAddressInput, resourceType });
      const handle = resource.data.link_transfers.handle;

      const item = await aptos.getTableItem<LinkTransferCoin | LinkTransferFA>({
        handle,
        data: { key_type: 'vector<u8>', value_type: valueType, key: hashHex },
      });

      const amount = parseFloat(item.amount);

      if (isAptCoin) {
        const display = (amount / Math.pow(10, tokens.APT.decimals)).toFixed(tokens.APT.decimals);
        setResolvedAmount(display);
      } else {
        const faData = item as LinkTransferFA;
        const tokenInfo = tokenAddressMap.get(faData.metadata_addr.toLowerCase());
        if (tokenInfo) {
          const display = (amount / Math.pow(10, tokenInfo.decimals)).toFixed(tokenInfo.decimals);
          setResolvedAsset(tokenInfo.symbol);
          setResolvedAmount(display);
        }
      }
    } catch (e) {
      console.error('Failed to fetch link info', e);
      toast.error("Could not find this link transfer. It may have already been claimed or is invalid.");
    } finally {
      setLoadingInfo(false);
    }
  }, [sender, secretHex, asset, aptos, linkHash, tokens, tokenAddressMap]);

  useEffect(() => {
    fetchLinkInfo();
  }, [fetchLinkInfo]);

  const handleClaim = async () => {
    if (!connected || !account) return toast.error('Please connect your wallet first');
    if (!sender || !secretHex) return toast.error('Invalid claim link');

    setIsClaiming(true);
    const startTime = performance.now();
    try {
      const resolvedLinkHash = await linkHash;
      if (!resolvedLinkHash) throw new Error("Invalid secret");

      const payload = resolvedAsset === 'APT'
        ? getClaimLinkCoinPayload(sender, resolvedLinkHash, tokens.APT.type)
        : getClaimLinkFungibleAssetPayload(sender, resolvedLinkHash);

      const flattenedFunctionArguments = payload.functionArguments.flat() as (string | number | boolean)[];

      const result = await executeTransaction(
        { ...payload, functionArguments: flattenedFunctionArguments },
        {
          successMessage: 'Funds claimed successfully!',
          errorMessage: 'Failed to claim funds',
        }
      );

      if (result.success) {
        const txHash = (result.response as { hash: string })?.hash;
        if (txHash) {
          await aptos.waitForTransaction({ transactionHash: txHash });
          const endTime = performance.now();
          setTransactionTimeMs(endTime - startTime);
        }
        setClaimed(true);
      }
    } catch (e) {
      console.error(e);
      // The useAptosTransaction hook will show the error toast.
      toast.error('Failed to claim funds. Please try again.');
    } finally {
      setIsClaiming(false);
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
                  <p className="text-sm text-muted-foreground">
                    You're receiving
                  </p>
                  <p className="text-5xl font-bold">
                    {resolvedAmount
                      ? `${resolvedAmount} ${resolvedAsset}`
                      : resolvedAsset}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    From{" "}
                    {sender
                      ? `${sender.slice(0, 10)}...${sender.slice(-6)}`
                      : ""}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleClaim}
                    disabled={isClaiming || loadingInfo}
                    className="w-full rounded-xl font-bold text-lg py-6"
                  >
                    {isClaiming ? "Claiming..." : "Claim Funds"}
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
                  <p className="text-2xl font-bold text-green-500">
                    Successfully Claimed!
                  </p>
                  <p className="text-5xl font-bold">
                    {resolvedAmount
                      ? `${resolvedAmount} ${resolvedAsset}`
                      : resolvedAsset}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Added to your wallet
                  </p>
                </div>

                <div className="p-4 bg-green-500/10 rounded-2xl border-2 border-green-500 text-center">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Transaction completed in{" "}
                    {Math.max(1, Math.round(transactionTimeMs ?? 0))} ms
                  </p>
                </div>
              </>
            )}
          </Card>

          {/* Info Banner */}
          <div className="p-6 rounded-2xl bg-primary/10 border-2 border-primary">
            <h3 className="font-bold text-lg mb-2">Link Transfers</h3>
            <p className="text-muted-foreground">
              Link transfers allow anyone to send money without knowing the
              recipient's wallet address. Just share a link and the funds are
              claimed instantly!
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Claim;