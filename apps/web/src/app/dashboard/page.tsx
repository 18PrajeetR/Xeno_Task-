"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, CircleDollarSign, Megaphone, ShieldAlert, Sparkles, UsersRound, Zap } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { compact, money } from "@/lib/utils";
import { Badge, Card, ErrorState, Loading } from "@/components/ui";

type Dashboard = {
  brand: { name: string };
  metrics: { customers: number; campaigns: number; revenue: number; opportunities: number; fatigue: number };
  funnel: { sent: number; delivered: number; opened: number; clicked: number; purchased: number; openRate: number; clickRate: number; conversionRate: number };
  insights: Array<{ id: string; category: string; title: string; narrative: string; severity: string }>;
  recentCampaigns: Array<{ id: string; name: string; channel: string; status: string; _count: { communications: number } }>;
};

export default function DashboardPage() {
  const query = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/dashboard"), refetchInterval: 8_000 });
  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <ErrorState message={query.error?.message ?? "Unknown error"} />;
  const data = query.data;
  const funnel = [
    { name: "Sent", value: data.funnel.sent },
    { name: "Delivered", value: data.funnel.delivered },
    { name: "Opened", value: data.funnel.opened },
    { name: "Clicked", value: data.funnel.clicked },
    { name: "Purchased", value: data.funnel.purchased },
  ];
  const metrics = [
    { label: "Total customers", value: compact(data.metrics.customers), icon: UsersRound, note: "Unified shopper profiles" },
    { label: "Attributed revenue", value: money(data.metrics.revenue), icon: CircleDollarSign, note: "Completed order value" },
    { label: "Ready to convert", value: compact(data.metrics.opportunities), icon: Zap, note: "High opportunity, safe fatigue" },
    { label: "Need protection", value: compact(data.metrics.fatigue), icon: ShieldAlert, note: "Fatigue score above 70" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 md:px-9">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div><p className="text-xs font-medium text-violet">GOOD EVENING</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Here’s what Genie sees.</h1><p className="mt-2 text-sm text-black/45">Live intelligence across {data.brand.name}.</p></div>
        <Badge tone="green"><span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live data</Badge>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <Card key={metric.label} className="p-5"><div className="flex items-center justify-between"><p className="text-xs text-black/40">{metric.label}</p><metric.icon size={16} className="text-black/35" /></div><p className="mt-4 text-2xl font-semibold tracking-tight">{metric.value}</p><p className="mt-1 text-[11px] text-black/35">{metric.note}</p></Card>)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_.65fr]">
        <Card className="p-6">
          <div className="flex items-start justify-between"><div><h2 className="font-semibold">Relationship funnel</h2><p className="mt-1 text-xs text-black/40">How communication turns into revenue.</p></div><div className="flex gap-5 text-right"><div><p className="text-[10px] text-black/35">OPEN RATE</p><strong className="text-sm">{data.funnel.openRate}%</strong></div><div><p className="text-[10px] text-black/35">CONVERSION</p><strong className="text-sm">{data.funnel.conversionRate}%</strong></div></div></div>
          <div className="mt-6 h-[270px]">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={funnel}><CartesianGrid vertical={false} stroke="#eee" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#aaa" }} /><Tooltip cursor={{ fill: "#f7f7f4" }} contentStyle={{ border: "1px solid #eee", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="value" fill="#6956e8" radius={[7, 7, 0, 0]} maxBarSize={48} /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2"><Sparkles size={16} className="text-violet" /><h2 className="font-semibold">Genie’s insight feed</h2></div>
          <div className="mt-4 divide-y divide-black/[0.05]">
            {data.insights.slice(0, 4).map((insight) => <div key={insight.id} className="py-4 first:pt-1"><div className="flex items-center gap-2"><span className="text-[10px] font-medium uppercase tracking-wider text-violet">{insight.category}</span>{insight.severity === "WARNING" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}</div><h3 className="mt-1.5 text-sm font-semibold">{insight.title}</h3><p className="mt-1 text-xs leading-5 text-black/45">{insight.narrative}</p></div>)}
          </div>
        </Card>
      </div>
      <Card className="mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.05] px-5 py-4"><div><h2 className="font-semibold">Recent campaign performance</h2><p className="mt-1 text-xs text-black/40">The latest decisions made with Genie.</p></div><button className="flex items-center gap-1 text-xs font-medium text-violet">View all <ArrowUpRight size={13} /></button></div>
        <div className="divide-y divide-black/[0.04]">
          {data.recentCampaigns.map((campaign) => <div key={campaign.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-black/[0.04]"><Megaphone size={15} /></div><div><p className="text-sm font-medium">{campaign.name}</p><p className="text-[11px] text-black/35">{campaign.channel}</p></div></div><Badge tone={campaign.status === "RUNNING" ? "green" : "neutral"}>{campaign.status}</Badge><span className="w-20 text-right text-xs text-black/45">{campaign._count.communications} reached</span></div>)}
        </div>
      </Card>
    </div>
  );
}

