import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Home from "./pages/Home";
import Transfer from "./pages/Transfer";
import Swap from "./pages/Swap";
import Receive from "./pages/Receive";
import Streaming from "./pages/Streaming";
import Claim from "./pages/Claim";
import ClaimStream from "./pages/ClaimStream";
import CashOut from "./pages/CashOut";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="supercash-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/streaming" element={<Streaming />} />
            <Route path="/claim/*" element={<Claim />} />
            <Route path="/claim-stream/*" element={<ClaimStream />} />
            <Route path="/cashout" element={<CashOut />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
