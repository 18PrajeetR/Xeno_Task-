"use client";

import {
  BarChart3,
  Bot,
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  Megaphone,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "Command Center", icon: Bot },
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/shoppers", label: "Shoppers", icon: UsersRound },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[244px] border-r border-black/[0.06] bg-[#f9f9f6] p-5 lg:block">
        <Link href="/" className="flex items-center gap-3 px-2 py-1">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink text-white shadow-lg shadow-black/10">
            <Sparkles size={17} />
          </div>
          <div>
            <p className="font-semibold tracking-[-0.02em]">Xeno Genie</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-black/40">AI relationship agent</p>
          </div>
        </Link>
        <nav className="mt-10 space-y-1.5">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/55 transition hover:bg-white hover:text-black",
                  active && "bg-white font-medium text-black shadow-sm ring-1 ring-black/[0.04]",
                )}
              >
                <item.icon size={17} strokeWidth={active ? 2.2 : 1.7} />
                {item.label}
                {item.href === "/" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet" />}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-black/[0.06] bg-white p-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ede9ff] text-violet"><CircleUserRound size={18} /></div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">Northstar Atelier</p>
              <p className="text-[11px] text-black/40">Demo workspace</p>
            </div>
            <ChevronDown size={14} className="text-black/35" />
          </div>
        </div>
      </aside>
      <div className="lg:pl-[244px]">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-black/[0.05] bg-paper/85 px-5 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-2 text-xs text-black/45">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.1)]" />
            Genie is online
          </div>
          <div className="flex items-center gap-2">
            <button className="grid h-9 w-9 place-items-center rounded-xl text-black/45 hover:bg-white"><Search size={17} /></button>
            <div className="rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white">RA</div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

