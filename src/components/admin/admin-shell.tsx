"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  FileText,
  ReceiptText,
  Wallet,
  Users2,
  LayoutDashboard,
  LogOut,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, match: (p: string) => p === "/admin" },
  { href: "/admin/students", label: "Students", icon: Users, match: (p: string) => p.startsWith("/admin/students") },
  { href: "/admin/invoices", label: "Invoices", icon: ReceiptText, match: (p: string) => p.startsWith("/admin/invoices") },
  { href: "/admin/finance", label: "Finance", icon: Wallet, match: (p: string) => p.startsWith("/admin/finance") },
  { href: "/admin/commissions", label: "Commissions", icon: TrendingUp, match: (p: string) => p.startsWith("/admin/commissions") },
  { href: "/admin/referrals", label: "Referrals", icon: Users2, match: (p: string) => p.startsWith("/admin/referrals") },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-brand-paper">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-brand-stone bg-brand-cream/30">
        <div className="px-6 py-6 flex items-center gap-3">
          <Image src="/logo.jpg" alt="" width={38} height={38} className="rounded" />
          <div className="leading-tight">
            <div className="font-display text-base text-brand-ink">Bridge to Malaysia</div>
            <div className="text-[10px] tracking-[0.2em] uppercase text-brand-muted">Admin</div>
          </div>
        </div>

        <nav className="px-3 flex-1 space-y-0.5">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition",
                  active
                    ? "bg-brand-ink text-brand-paper font-medium"
                    : "text-brand-ink/80 hover:bg-brand-stone/40"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-brand-stone/80">
          <div className="text-xs text-brand-muted truncate" title={email}>
            {email}
          </div>
          <button
            onClick={signOut}
            className="mt-2 inline-flex items-center gap-2 text-xs text-brand-ink/80 hover:text-brand-ink"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-brand-stone bg-brand-cream/40 sticky top-0 z-30 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2">
          <Image src="/logo.jpg" alt="" width={28} height={28} className="rounded" />
          <span className="font-display text-base text-brand-ink">Admin</span>
        </Link>
        <button onClick={signOut} className="btn-ghost text-xs">
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      <main className="flex-1 min-w-0 pb-24 lg:pb-10">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-brand-paper/95 backdrop-blur border-t border-brand-stone">
        <div className="grid grid-cols-5">
          {NAV.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-wider",
                  active ? "text-brand-bridge" : "text-brand-muted"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
