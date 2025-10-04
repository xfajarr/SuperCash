import { useEffect, useMemo, useState } from "react";
import type { AdapterNotDetectedWallet, AdapterWallet } from "@aptos-labs/wallet-adapter-react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";
import { toast } from "sonner";
import { Wallet as WalletIcon, Check, ChevronDown, Copy, ExternalLink, Loader2, LogOut, ArrowUpRight } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const mapNetworkToExplorerParam = (value?: Network | string): "mainnet" | "devnet" | "testnet" => {
  if (!value) return "testnet";
  
  const normalized = typeof value === "string" ? value.toLowerCase() : (value as string).toLowerCase();
  
  switch (true) {
    case normalized.includes("main"):
      return "mainnet";
    case normalized.includes("dev"):
      return "devnet";
    default:
      return "testnet";
  }
}

type WalletConnectorProps = Omit<ButtonProps, "onClick"> & {
  fullWidth?: boolean;
};

const WalletConnector = ({
  className,
  variant = "default",
  size = "default",
  fullWidth,
  ...buttonProps
}: WalletConnectorProps) => {
  const {
    account,
    connect,
    disconnect,
    connected,
    isLoading,
    network,
    wallet,
    wallets,
    notDetectedWallets,
  } = useWallet();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading) {
      setPendingWallet(null);
      if (connected) {
        setIsDialogOpen(false);
      }
    }
  }, [connected, isLoading]);

  const addressLabel = useMemo(() => {
    if (!account?.address) return "";
    const addressStr = account.address.toString();
    return `${addressStr.slice(0, 6)}...`;
  }, [account?.address]);

  const explorerUrl = useMemo(() => {
    if (!account?.address) return null;
    const addressStr = account.address.toString();
    return `https://explorer.aptoslabs.com/account/${addressStr}?network=${mapNetworkToExplorerParam(network?.name)}`;
  }, [account?.address, network?.name]);

  const handleConnect = (walletName: string) => {
    setPendingWallet(walletName);
    try {
      connect(walletName);
    } catch (error) {
      console.error("Failed to connect wallet", error);
      toast.error("Unable to connect wallet");
      setPendingWallet(null);
    }
  };

  const handleCopyAddress = () => {
    if (!account?.address) return;

    const addressStr = account.address.toString();
    navigator.clipboard
      .writeText(addressStr)
      .then(() => toast.success("Address copied"))
      .catch(() => toast.error("Failed to copy address"));
  };

  const handleDisconnect = () => {
    disconnect();
    toast.message("Wallet disconnected");
  };

  const handleOpenWalletUrl = (walletOption: AdapterNotDetectedWallet | AdapterWallet) => {
    if (!("url" in walletOption) || !walletOption.url) return;
    window.open(walletOption.url, "_blank", "noopener,noreferrer");
  };

  if (connected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            {...buttonProps}
            variant={variant}
            size={size}
            className={cn("rounded-full font-semibold", fullWidth && "w-full", className)}
          >
            <WalletIcon className="h-4 w-4" />
            {addressLabel || "Wallet"}
            <ChevronDown className="h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 rounded-xl border-2">
          <DropdownMenuLabel className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground">Connected wallet</div>
            <div className="font-semibold">{wallet?.name ?? "Unknown"}</div>
            {account?.address && (
              <div className="font-mono text-xs text-muted-foreground break-all">{account.address.toString()}</div>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleCopyAddress} className="gap-2">
            <Copy className="h-4 w-4" /> Copy address
          </DropdownMenuItem>
          {explorerUrl && (
            <DropdownMenuItem
              onClick={() => window.open(explorerUrl, "_blank", "noopener,noreferrer")}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" /> View on explorer
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDisconnect} className="gap-2 text-destructive">
            <LogOut className="h-4 w-4" /> Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          {...buttonProps}
          variant={variant}
          size={size}
          className={cn("rounded-full font-semibold", fullWidth && "w-full", className)}
        >
          {isLoading && pendingWallet ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WalletIcon className="h-4 w-4" />
          )}
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border-2">
        <DialogHeader>
          <DialogTitle>Connect a wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet provider to sign transactions and manage your SuperCash experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {wallets.length ? (
            wallets.map((walletOption) => {
              const isActive = wallet?.name === walletOption.name;
              const isPending = pendingWallet === walletOption.name;
              return (
                <Button
                  key={walletOption.name}
                  variant="outline"
                  className={cn(
                    "w-full justify-between rounded-xl border-2 bg-background",
                    isActive && "border-primary/80 bg-primary/10"
                  )}
                  onClick={() => handleConnect(walletOption.name)}
                  disabled={isPending}
                >
                  <div className="flex items-center gap-3">
                    {walletOption.icon ? (
                      <img
                        src={walletOption.icon}
                        alt={walletOption.name}
                        className="h-8 w-8 rounded-full border border-border"
                      />
                    ) : (
                      <WalletIcon className="h-6 w-6" />
                    )}
                    <div className="flex flex-col items-start">
                      <span className="font-semibold">{walletOption.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {isActive ? "Connected" : "Installed"}
                      </span>
                    </div>
                  </div>
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isActive ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No compatible wallets detected. Install an Aptos wallet extension to get started.
            </div>
          )}
        </div>

        {notDetectedWallets.length > 0 && (
          <div className="space-y-3">
            <Separator className="my-4" />
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested wallets</p>
            {notDetectedWallets.map((walletOption) => (
              <Button
                key={walletOption.name}
                variant="ghost"
                className="w-full justify-between rounded-xl border border-dashed"
                onClick={() => handleOpenWalletUrl(walletOption)}
              >
                <div className="flex items-center gap-3">
                  {walletOption.icon ? (
                    <img
                      src={walletOption.icon}
                      alt={walletOption.name}
                      className="h-8 w-8 rounded-full border border-border"
                    />
                  ) : (
                    <WalletIcon className="h-6 w-6" />
                  )}
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{walletOption.name}</span>
                    <span className="text-xs text-muted-foreground">Tap to install or learn more</span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4" />
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WalletConnector;
