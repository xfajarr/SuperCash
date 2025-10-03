import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNetwork } from "@/contexts/NetworkContext";
import { ChevronDown, Globe } from "lucide-react";

export const NetworkSwitcher = () => {
  const { network, setNetwork, networkConfig } = useNetwork();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <span className="capitalize">{network}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => setNetwork("mainnet")}
          className={network === "mainnet" ? "bg-accent" : ""}
        >
          <div className="flex flex-col items-start">
            <span>Mainnet</span>
            <span className="text-xs">
              Production network
            </span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setNetwork("testnet")}
          className={network === "testnet" ? "bg-accent" : ""}
        >
          <div className="flex flex-col items-start">
            <span>Testnet</span>
            <span className="text-xs">
              Testing network
            </span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};