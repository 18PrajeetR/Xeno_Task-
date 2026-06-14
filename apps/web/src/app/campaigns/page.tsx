"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bot, CalendarDays, Megaphone } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Badge, Card, ErrorState, Loading } from "@/components/ui";

type Campaign = { id: string; name: string; goal: string; channel: string; status: string; createdAt: string; message: string; segment?: { name: string; estimatedSize: number }; _count: { communications: number } };

export default function CampaignsPage() {
  const query = useQuery({ queryKey: ["campaigns"], queryFn: () => api<Campaign[]>("/campaigns"), refetchInterval: 8_000 });
  return <div className="mx-auto max-w-7xl px-5 py-8 md:px-9">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-xs font-medium text-violet">CAMPAIGNS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Decisions Genie is running.</h1><p className="mt-2 text-sm text-black/45">Every campaign begins with an outcome, not a segment builder.</p></div><Link href="/" className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-medium text-white"><Bot size={15} /> Give Genie a goal</Link></div>
    {query.isLoading ? <Loading /> : query.isError || !query.data ? <ErrorState message={query.error?.message ?? "Unknown error"} /> : <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{query.data.slice(0, 18).map((campaign) => <Card key={campaign.id} className="group p-5 transition hover:-translate-y-0.5 hover:shadow-soft"><div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#f0edff] text-violet"><Megaphone size={17} /></div><Badge tone={campaign.status === "RUNNING" ? "green" : campaign.status === "APPROVED" ? "violet" : "neutral"}>{campaign.status}</Badge></div><h2 className="mt-5 font-semibold">{campaign.name}</h2><p className="mt-1 line-clamp-1 text-xs text-black/40">{campaign.goal}</p><div className="mt-5 rounded-xl bg-[#f8f8f5] p-3"><p className="line-clamp-2 text-xs leading-5 text-black/55">“{campaign.message}”</p></div><div className="mt-5 flex items-center justify-between border-t border-black/[0.05] pt-4 text-[11px] text-black/40"><span>{campaign.channel} · {campaign._count.communications} reached</span><span className="flex items-center gap-1"><CalendarDays size={12} /> {new Date(campaign.createdAt).toLocaleDateString()}</span></div></Card>)}</div>}
  </div>;
}

