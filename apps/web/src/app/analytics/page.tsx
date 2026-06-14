"use client";

import { useQuery } from "@tanstack/react-query";
import { CircleDollarSign, MousePointerClick, ShoppingBag, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Card, ErrorState, Loading } from "@/components/ui";

type Analytics = {
  revenue: number;
  roi: number;
  byChannel: Array<{ channel: string; status: string; _count: number }>;
  campaigns: Array<{ id: string; name: string; channel: string; createdAt: string; sent: number; clicked: number; purchased: number }>;
};

export default function AnalyticsPage() {
  const query = useQuery({ queryKey: ["analytics"], queryFn: () => api<Analytics>("/analytics"), refetchInterval: 7_000 });
  if (query.isLoading) return <Loading />;
  if (query.isError || !query.data) return <ErrorState message={query.error?.message ?? "Unknown error"} />;
  const data = query.data;
  const sent = data.campaigns.reduce((sum, item) => sum + item.sent, 0);
  const clicked = data.campaigns.reduce((sum, item) => sum + item.clicked, 0);
  const purchased = data.campaigns.reduce((sum, item) => sum + item.purchased, 0);
  const metrics = [
    { label: "Attributed revenue", value: money(data.revenue), icon: CircleDollarSign },
    { label: "Return on spend", value: `${data.roi}x`, icon: TrendingUp },
    { label: "Click-through", value: `${sent ? ((clicked / sent) * 100).toFixed(1) : 0}%`, icon: MousePointerClick },
    { label: "Conversions", value: purchased, icon: ShoppingBag },
  ];
  const channelData = ["EMAIL", "SMS", "WHATSAPP"].map((channel) => {
    const rows = data.byChannel.filter((row) => row.channel === channel);
    return {
      channel: channel[0] + channel.slice(1).toLowerCase(),
      delivered: rows.filter((row) => ["DELIVERED", "OPENED", "READ", "CLICKED", "PURCHASED"].includes(row.status)).reduce((sum, row) => sum + row._count, 0),
      engaged: rows.filter((row) => ["OPENED", "READ", "CLICKED", "PURCHASED"].includes(row.status)).reduce((sum, row) => sum + row._count, 0),
      purchased: rows.find((row) => row.status === "PURCHASED")?._count ?? 0,
    };
  });
  return <div className="mx-auto max-w-7xl px-5 py-8 md:px-9">
    <div><p className="text-xs font-medium text-violet">ANALYTICS</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">From message to purchase.</h1><p className="mt-2 text-sm text-black/45">Live lifecycle events and last-touch revenue attribution.</p></div>
    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="p-5"><div className="flex items-center justify-between text-xs text-black/40"><span>{metric.label}</span><metric.icon size={15} /></div><p className="mt-4 text-2xl font-semibold">{metric.value}</p></Card>)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card className="p-6"><h2 className="font-semibold">Channel performance</h2><p className="mt-1 text-xs text-black/40">Delivery, engagement, and purchase outcomes by channel.</p><div className="mt-6 h-[310px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={channelData}><CartesianGrid vertical={false} stroke="#eee" /><XAxis dataKey="channel" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="delivered" fill="#d8d3f7" radius={[5, 5, 0, 0]} /><Bar dataKey="engaged" fill="#6956e8" radius={[5, 5, 0, 0]} /><Bar dataKey="purchased" fill="#43b77b" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card className="overflow-hidden"><div className="border-b border-black/[0.05] p-5"><h2 className="font-semibold">Campaign attribution</h2><p className="mt-1 text-xs text-black/40">Recent campaign conversion performance.</p></div><div className="thin-scrollbar max-h-[370px] divide-y divide-black/[0.04] overflow-y-auto">{data.campaigns.map((campaign) => <div key={campaign.id} className="grid grid-cols-[1fr_auto] gap-5 px-5 py-4"><div><p className="text-sm font-medium">{campaign.name}</p><p className="mt-1 text-[11px] text-black/35">{campaign.channel} · {new Date(campaign.createdAt).toLocaleDateString()}</p></div><div className="flex gap-6 text-right"><div><p className="text-[10px] text-black/30">CLICKED</p><p className="mt-1 text-sm font-semibold">{campaign.clicked}</p></div><div><p className="text-[10px] text-black/30">BOUGHT</p><p className="mt-1 text-sm font-semibold text-emerald-600">{campaign.purchased}</p></div></div></div>)}</div></Card>
    </div>
  </div>;
}

