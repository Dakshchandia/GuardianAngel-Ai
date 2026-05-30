"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Mic, Users, FileText, Settings, Lock } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis", label: "Analysis", icon: Mic },
  { href: "/family", label: "Family", icon: Users },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-primary/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center group-hover:bg-primary/30 transition-all">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <span className="font-display font-bold text-lg text-white hidden sm:block">
            Guardian<span className="text-primary">Angel</span>
            <span className="text-text-muted text-xs font-normal ml-2">AI</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-text-muted hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:block">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-safe/10 border border-safe/20">
            <div className="pulse-dot-green" />
            <span className="text-safe text-xs font-semibold">Protected</span>
          </div>
          <div className="flex items-center gap-1.5 text-text-muted text-xs">
            <Lock className="w-3 h-3" />
            <span className="hidden sm:block">Privacy On</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
