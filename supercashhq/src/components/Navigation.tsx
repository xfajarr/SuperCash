import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Zap, Menu, Wallet, LogOut } from "lucide-react";
import { TokenSelector } from "./TokenSelector";
import { ThemeToggle } from "./ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";
import { useAptosWallet } from "@/hooks/useAptosWallet";

const Navigation = () => {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { connected, connecting, address, connect, disconnect } = useAptosWallet();

  const isActive = (path: string) => location.pathname === path;

  const formatAddress = (addr: string | undefined) => {
    if (!addr || typeof addr !== 'string') return "";
    try {
      if (addr.length < 10) return addr;
      return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    } catch (e) {
      console.error("Error formatting address:", e);
      return "";
    }
  };

  const navLinks = [
    { path: "/", label: "Home" },
    { path: "/transfer", label: "Transfer" },
    { path: "/swap", label: "Swap" },
    { path: "/receive", label: "Receive" },
    { path: "/streaming", label: "Streaming" },
    { path: "/cashout", label: "Cash Out" },
  ];

  return (
    <nav className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-2 rounded-xl border-2 border-foreground transition-transform group-hover:scale-105">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold">SuperCash</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}>
                <Button
                  variant={isActive(link.path) ? "default" : "ghost"}
                  className="rounded-full">
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <TokenSelector />
            <ThemeToggle />
            {connected ? (
              <div className="flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary text-sm font-medium">
                  {formatAddress(address)}
                </div>
                <Button
                  onClick={disconnect}
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => connect()}
                disabled={connecting}
                className="rounded-full font-semibold"
              >
                <Wallet className="w-4 h-4 mr-2" />
                {connecting ? "Connecting..." : "Connect Wallet"}
              </Button>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="flex md:hidden items-center gap-2">
            <TokenSelector />
            <ThemeToggle />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-2">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[300px] rounded-l-2xl border-l-2">
                <div className="flex flex-col gap-4 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setOpen(false)}>
                      <Button
                        variant={isActive(link.path) ? "default" : "ghost"}
                        className="w-full justify-start rounded-xl text-lg">
                        {link.label}
                      </Button>
                    </Link>
                  ))}
                  {connected ? (
                    <div className="space-y-3 mt-4">
                      <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary text-center font-medium">
                        {formatAddress(address)}
                      </div>
                      <Button
                        onClick={disconnect}
                        variant="outline"
                        className="w-full rounded-xl font-semibold text-lg"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => connect()}
                      disabled={connecting}
                      className="rounded-xl font-semibold text-lg mt-4"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      {connecting ? "Connecting..." : "Connect Wallet"}
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
