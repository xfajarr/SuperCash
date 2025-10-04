import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Send,
  ArrowDownUp,
  Radio,
  Download,
  DollarSign,
  Inbox,
} from "lucide-react";

const BottomNav = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/transfer", label: "Send", icon: Send },
    { path: "/receive", label: "Receive", icon: Download },
    { path: "/streaming", label: "Stream", icon: Radio },
    { path: "/claim-stream", label: "Claim", icon: Inbox },
    { path: "/cashout", label: "Cash Out", icon: DollarSign },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t-2 border-border z-50 pb-safe">
      <div className="flex items-center justify-around px-2 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
