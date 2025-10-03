import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tokens = [
  { symbol: "APT", name: "Aptos", icon: "/Aptos_mark_BLK.svg" },
  { symbol: "USDC", name: "USD Coin", icon: "/usd-coin-usdc-logo.svg" },
  { symbol: "PYUSD", name: "PayPal USD", icon: "/paypal-usd-pyusd-logo.svg" },
  { symbol: "USDT", name: "Tether", icon: "/usdt_logo.svg" },
];

export const TokenSelector = () => {
  const [selectedToken, setSelectedToken] = useState("USDC");
  const selected = useMemo(() => tokens.find(t => t.symbol === selectedToken), [selectedToken]);

  return (
    <Select value={selectedToken} onValueChange={setSelectedToken}>
      <SelectTrigger className="w-[150px] rounded-full border-2">
        <SelectValue>
          {selected ? (
            <div className="flex items-center gap-2">
              <img src={selected.icon} alt={selected.symbol} className="h-4 w-4" />
              <span className="font-semibold">{selected.symbol}</span>
            </div>
          ) : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-2">
        {tokens.map((token) => (
          <SelectItem 
            key={token.symbol} 
            value={token.symbol}
            className="rounded-lg"
          >
            <div className="flex items-center gap-2">
              <img src={token.icon} alt={token.symbol} className="h-4 w-4" />
              <span className="font-semibold">{token.symbol}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};