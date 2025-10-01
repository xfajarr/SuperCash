import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Globe2, Shield, Sparkles, Layers, Users, TrendingUp, Coins, Clock, Network, Send, ArrowDownUp, Radio, Wallet, DollarSign } from "lucide-react";
import Navigation from "@/components/Navigation";
import BottomNav from "@/components/BottomNav";
import globeImage from "@/assets/globe-animation.jpg";
import { Card } from "@/components/ui/card";

const Home = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-primary bg-secondary text-sm font-semibold mb-4 animate-float">
            <Sparkles className="w-4 h-4" />
            <span>Built on Aptos Blockchain</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Send Money{" "}
            <span className="text-primary">Anywhere</span>
            <br />
            In Under{" "}
            <span className="relative inline-block">
              <span className="text-primary">1 Second</span>
              <div className="absolute -bottom-2 left-0 right-0 h-1 bg-primary rounded-full" />
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            The world's fastest payment platform. Zero fees, instant transfers, and a seamless experience powered by Aptos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/transfer">
              <Button size="lg" className="rounded-full font-bold text-lg px-8 py-6 group">
                Start Sending
                <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline" 
              className="rounded-full font-bold text-lg px-8 py-6 border-2"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="p-8 rounded-2xl border-2 border-border bg-card hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Lightning Fast</h3>
            <p className="text-muted-foreground">
              Transactions finalize in under 1 second using Aptos's parallel execution engine
            </p>
          </div>
          
          <div className="p-8 rounded-2xl border-2 border-border bg-card hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
              <Globe2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Global Reach</h3>
            <p className="text-muted-foreground">
              Send stablecoins anywhere in the world with no borders or restrictions
            </p>
          </div>
          
          <div className="p-8 rounded-2xl border-2 border-border bg-card hover:border-primary transition-colors">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold mb-3">Zero Fees</h3>
            <p className="text-muted-foreground">
              We sponsor all gas fees so you never pay for transactions
            </p>
          </div>
        </div>
      </section>

      {/* Speed Highlight Section with Globe */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground animate-pulse-subtle">
                <Zap className="w-8 h-8" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Powered by Aptos
              </h2>
              <p className="text-xl text-muted-foreground">
                The fastest Layer 1 blockchain enables SuperCash to deliver unmatched speed and reliability for global payments
              </p>
              <div className="grid grid-cols-3 gap-6 pt-4">
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">&lt;1s</div>
                  <div className="text-sm text-muted-foreground">Transaction Time</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">$0</div>
                  <div className="text-sm text-muted-foreground">User Fees</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary mb-1">160k+</div>
                  <div className="text-sm text-muted-foreground">TPS Capacity</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img 
                src={globeImage} 
                alt="Global payment network visualization" 
                className="w-full h-auto rounded-2xl border-2 border-border animate-float"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent rounded-2xl pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Border Payments Animation Section */}
      <section className="container mx-auto px-4 py-20 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Break Down <span className="text-primary">Global Barriers</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Send money across borders instantly, without intermediaries or excessive fees
            </p>
          </div>

          <div className="relative">
            {/* Animated Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 animate-fade-in" style={{ animationDelay: '0ms' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">🌍 → 🌎</div>
                </div>
                <h3 className="text-xl font-bold mb-2">Europe to Americas</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Instant transfers from London to New York in under 1 second
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold">&lt;1s</span>
                  <span className="text-muted-foreground">vs 3-5 days traditional</span>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 animate-fade-in" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Network className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">🌏 → 🌍</div>
                </div>
                <h3 className="text-xl font-bold mb-2">Asia to Africa</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Direct peer-to-peer payments without correspondent banks
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Coins className="w-4 h-4 text-primary" />
                  <span className="font-semibold">$0 fees</span>
                  <span className="text-muted-foreground">vs $25-50 traditional</span>
                </div>
              </Card>

              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold">🌎 → 🌏</div>
                </div>
                <h3 className="text-xl font-bold mb-2">Americas to Asia</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  24/7 availability with guaranteed delivery and transparent rates
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="font-semibold">100% uptime</span>
                  <span className="text-muted-foreground">No banking hours</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Parallel Execution Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 animate-pulse-subtle">
                <Layers className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Parallel Execution <span className="text-primary">Engine</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                Unlike traditional blockchains that process transactions sequentially, Aptos processes thousands simultaneously through its revolutionary Block-STM parallel execution engine
              </p>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">160,000+ TPS</h4>
                    <p className="text-muted-foreground">Capable of processing over 160,000 transactions per second</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Network className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Smart Conflict Detection</h4>
                    <p className="text-muted-foreground">Automatically detects and resolves transaction dependencies</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Optimistic Concurrency</h4>
                    <p className="text-muted-foreground">Validates transactions in parallel for maximum throughput</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Card className="p-8 rounded-2xl border-2 bg-gradient-to-br from-primary/5 to-secondary space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">Traditional Blockchain</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-12 bg-muted rounded-lg flex items-center justify-center text-xs font-mono">
                      TX 1 → TX 2 → TX 3
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Sequential Processing</p>
                </div>
                <div className="flex items-center justify-center py-2">
                  <ArrowRight className="w-6 h-6 text-primary rotate-90" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold text-primary">Aptos Parallel Execution</p>
                  <div className="space-y-2">
                    <div className="h-8 bg-primary/20 rounded-lg flex items-center justify-center text-xs font-mono animate-fade-in" style={{ animationDelay: '0ms' }}>TX 1, TX 2, TX 3</div>
                    <div className="h-8 bg-primary/30 rounded-lg flex items-center justify-center text-xs font-mono animate-fade-in" style={{ animationDelay: '100ms' }}>TX 4, TX 5, TX 6</div>
                    <div className="h-8 bg-primary/40 rounded-lg flex items-center justify-center text-xs font-mono animate-fade-in" style={{ animationDelay: '200ms' }}>TX 7, TX 8, TX 9</div>
                  </div>
                  <p className="text-xs font-semibold text-primary">Parallel Processing</p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Why Choose <span className="text-primary">SuperCash</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The future of payments is here, built on the most advanced blockchain technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Users className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">For Everyone</h3>
              <p className="text-muted-foreground">
                No technical knowledge required. Send money as easily as sending a text message
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Shield className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Bank-Grade Security</h3>
              <p className="text-muted-foreground">
                Multi-signature wallets, hardware security modules, and formal verification
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Coins className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Multi-Token Support</h3>
              <p className="text-muted-foreground">
                USDC, USDT, PYUSD, and APT all supported natively with instant swaps
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <TrendingUp className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Low Latency</h3>
              <p className="text-muted-foreground">
                Sub-second finality means your transactions are confirmed almost instantly
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Globe2 className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">24/7 Availability</h3>
              <p className="text-muted-foreground">
                No banking hours, no holidays. Send money anytime, anywhere in the world
              </p>
            </Card>

            <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <Sparkles className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-3">Innovation First</h3>
              <p className="text-muted-foreground">
                Continuous updates, new features, and improvements based on user feedback
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* All Features Showcase */}
      <section className="container mx-auto px-4 py-20 bg-secondary/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold">
              Everything You Need for <span className="text-primary">Digital Finance</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One platform with all the tools to manage, send, and grow your money
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Transfer */}
            <Link to="/transfer">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Send className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Send Money</h3>
                <p className="text-muted-foreground mb-4">
                  Direct transfers or payment links. Send to anyone, anywhere, instantly.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Try it now <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>

            {/* Receive */}
            <Link to="/receive">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Wallet className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Receive Payments</h3>
                <p className="text-muted-foreground mb-4">
                  Share your address or create payment requests with custom amounts.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Get paid now <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>

            {/* Swap */}
            <Link to="/swap">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <ArrowDownUp className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Swap Tokens</h3>
                <p className="text-muted-foreground mb-4">
                  Exchange between USDC, USDT, PYUSD, and APT at the best rates.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Start swapping <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>

            {/* Streaming */}
            <Link to="/streaming">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Radio className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Money Streaming</h3>
                <p className="text-muted-foreground mb-4">
                  Stream payments continuously. Perfect for salaries and subscriptions.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Create stream <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>

            {/* Cash Out */}
            <Link to="/cashout">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <DollarSign className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Cash Out</h3>
                <p className="text-muted-foreground mb-4">
                  Convert crypto to fiat via bank transfer or debit card instantly.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Withdraw funds <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>

            {/* Demo Links */}
            <Link to="/claim?amount=100&token=USDC&from=0xdemo">
              <Card className="p-6 rounded-2xl border-2 hover:border-primary transition-all duration-300 group h-full bg-gradient-to-br from-primary/5 to-primary/10">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <Sparkles className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">Try Demo Features</h3>
                <p className="text-muted-foreground mb-4">
                  Experience link claiming, streaming, and all features risk-free.
                </p>
                <div className="flex items-center text-primary font-semibold text-sm group-hover:translate-x-2 transition-transform">
                  Explore demos <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 rounded-2xl border-2 border-primary bg-gradient-to-br from-primary/10 to-secondary text-center space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">
              Ready to Experience the Future?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users already sending money at the speed of light
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <Link to="/transfer">
                <Button size="lg" className="rounded-full font-bold text-lg px-8 py-6 group">
                  Get Started Now
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/receive">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="rounded-full font-bold text-lg px-8 py-6 border-2"
                >
                  Request Payment
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};

export default Home;
