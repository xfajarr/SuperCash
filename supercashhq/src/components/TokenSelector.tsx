import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const tokens = [
  { symbol: "APT", name: "Aptos" },
  { symbol: "USDC", name: "USD Coin" },
  { symbol: "PYUSD", name: "PayPal USD" },
  { symbol: "USDT", name: "Tether" },
];

export const TokenSelector = () => {
  const [selectedToken, setSelectedToken] = useState("APT");

  return (
    <Select value={selectedToken} onValueChange={setSelectedToken}>
      <SelectTrigger className="w-[120px] rounded-full border-2">
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
  );
};
