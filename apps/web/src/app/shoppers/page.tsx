"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Badge, Card, ErrorState, Loading } from "@/components/ui";

type Shopper = { id: string; firstName: string; lastName: string; email: string; city: string; status: string; preferredChannel: string; totalSpend: string; orderCount: number; fatigueScore: number; opportunityScore: number };

export default function ShoppersPage() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["shoppers", search], queryFn: () => api<Shopper[]>(`/customers?q=${encodeURIComponent(search)}&limit=100`) });
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-9">
      <div><p className="text-xs font-medium text-violet">SHOPPER INTELLIGENCE</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Every customer, understood.</h1><p className="mt-2 text-sm text-black/45">Ranked by current purchase opportunity with fatigue protection built in.</p></div>
      <Card className="mt-7 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.05] p-4"><div className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-black/[0.035] px-3 py-2"><Search size={15} className="text-black/35" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="w-full bg-transparent text-xs outline-none" /></div><button className="ml-3 grid h-9 w-9 place-items-center rounded-xl border border-black/[0.06]"><SlidersHorizontal size={15} /></button></div>
        {query.isLoading ? <Loading /> : query.isError || !query.data ? <ErrorState message={query.error?.message ?? "Unknown error"} /> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left"><thead className="bg-[#fafaf8] text-[10px] uppercase tracking-wider text-black/35"><tr><th className="px-5 py-3 font-medium">Shopper</th><th className="px-4 py-3 font-medium">Relationship</th><th className="px-4 py-3 font-medium">Value</th><th className="px-4 py-3 font-medium">Opportunity</th><th className="px-4 py-3 font-medium">Fatigue</th><th className="px-4 py-3 font-medium">Channel</th></tr></thead><tbody className="divide-y divide-black/[0.04]">{query.data.map((shopper) => <tr key={shopper.id} className="transition hover:bg-[#fafaf8]"><td className="px-5 py-4"><Link href={`/shoppers/${shopper.id}`} className="block"><p className="text-sm font-medium">{shopper.firstName} {shopper.lastName}</p><p className="mt-0.5 text-[11px] text-black/35">{shopper.email} · {shopper.city}</p></Link></td><td className="px-4 py-4"><Badge tone={shopper.status === "ACTIVE" ? "green" : "neutral"}>{shopper.status}</Badge></td><td className="px-4 py-4"><p className="text-sm font-medium">{money(Number(shopper.totalSpend))}</p><p className="text-[11px] text-black/35">{shopper.orderCount} orders</p></td><td className="px-4 py-4"><Score value={shopper.opportunityScore} color="bg-emerald-500" /></td><td className="px-4 py-4"><Score value={shopper.fatigueScore} color={shopper.fatigueScore >= 70 ? "bg-amber-500" : "bg-violet"} /></td><td className="px-4 py-4 text-xs capitalize text-black/55">{shopper.preferredChannel.toLowerCase()}</td></tr>)}</tbody></table></div>
        )}
      </Card>
    </div>
  );
}

function Score({ value, color }: { value: number; color: string }) {
  return <div className="flex items-center gap-2"><strong className="w-6 text-sm">{value}</strong><div className="h-1.5 w-16 rounded-full bg-black/[0.05]"><div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} /></div></div>;
}

