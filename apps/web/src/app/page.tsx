"use client";

import { useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  CircleDollarSign,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  UsersRound,
  WandSparkles,
} from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { money } from "@/lib/utils";
import { Badge, Card } from "@/components/ui";

type Plan = {
  planId: string;
  source: "GEMINI" | "FALLBACK";
  goal: string;
  audience: { name: string; estimatedSize: number; protectedByFatiguePolicy: number; reasoning: string };
  strategy: { summary: string; reasoning: string };
  channel: { value: string; reasoning: string };
  message: { body: string; reasoning: string };
  expectedOutcome: {
    openRate: [number, number];
    clickRate: [number, number];
    conversionRate: [number, number];
    revenue: [number, number];
  };
  followUp: string;
};

const suggestions = [
  "Bring back inactive shoppers",
  "Increase repeat purchases",
  "Boost weekend revenue",
];

export default function CommandCenter() {
  const [goal, setGoal] = useState("");
  const [campaignId, setCampaignId] = useState<string>();
  const [launched, setLaunched] = useState<number>();

  const planMutation = useMutation({
    mutationFn: () => api<Plan>("/copilot/plan", { method: "POST", body: JSON.stringify({ goal }) }),
    onSuccess: () => { setCampaignId(undefined); setLaunched(undefined); },
  });
  const approveMutation = useMutation({
    mutationFn: (planId: string) => api<{ id: string }>("/campaigns", { method: "POST", body: JSON.stringify({ planId }) }),
    onSuccess: (campaign) => setCampaignId(campaign.id),
  });
  const launchMutation = useMutation({
    mutationFn: (id: string) => api<{ queued: number }>(`/campaigns/${id}/launch`, { method: "POST" }),
    onSuccess: (result) => setLaunched(result.queued),
  });

  const plan = planMutation.data;
  const submit = () => goal.trim().length >= 5 && planMutation.mutate();

  return (
    <div className="mesh min-h-[calc(100vh-64px)]">
      <div className="mx-auto max-w-6xl px-5 py-10 md:px-9 md:py-14">
        {!plan && (
          <section className="mx-auto max-w-3xl pt-[8vh] text-center fade-up">
            <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-white shadow-xl shadow-black/15">
              <WandSparkles size={21} />
            </div>
            <Badge tone="violet">AI Command Center</Badge>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.045em] md:text-6xl">
              What should we achieve?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-black/50">
              Tell Genie the business outcome. It will discover the audience, protect tired shoppers, and design the campaign.
            </p>
            <div className="mt-9 rounded-[24px] border border-black/[0.07] bg-white p-2 shadow-soft">
              <textarea
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); }
                }}
                placeholder="e.g. Bring back valuable customers without over-messaging them"
                className="h-28 w-full resize-none rounded-2xl bg-transparent p-4 text-[15px] outline-none placeholder:text-black/30"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <div className="flex items-center gap-2 text-[11px] text-black/35">
                  <Sparkles size={13} /> Gemini-powered strategy
                </div>
                <button
                  onClick={submit}
                  disabled={goal.trim().length < 5 || planMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-medium text-white transition hover:bg-black disabled:opacity-40"
                >
                  {planMutation.isPending ? "Thinking..." : "Build campaign"} <ArrowRight size={14} />
                </button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((item) => (
                <button key={item} onClick={() => setGoal(item)} className="rounded-full border border-black/[0.07] bg-white/70 px-3 py-2 text-xs text-black/50 hover:bg-white hover:text-black">
                  {item}
                </button>
              ))}
            </div>
            {planMutation.isError && <p className="mt-5 text-sm text-rose-600">{planMutation.error.message}</p>}
          </section>
        )}

        {plan && (
          <section className="fade-up">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="violet"><Sparkles size={11} className="mr-1" /> {plan.source === "GEMINI" ? "Designed by Gemini" : "Demo strategy engine"}</Badge>
                  <span className="text-xs text-black/35">Ready for review</span>
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">{plan.goal}</h1>
                <p className="mt-2 text-sm text-black/45">Genie has turned your goal into an executable, fatigue-safe campaign.</p>
              </div>
              <button onClick={() => planMutation.reset()} className="text-xs font-medium text-black/45 hover:text-black">Start a new goal</button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
              <div className="space-y-4">
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eefaf2] text-emerald-700"><UsersRound size={18} /></div>
                      <div><p className="text-xs text-black/40">Recommended audience</p><h2 className="mt-0.5 font-semibold">{plan.audience.name}</h2></div>
                    </div>
                    <span className="text-2xl font-semibold tracking-tight">{plan.audience.estimatedSize}</span>
                  </div>
                  <p className="mt-5 border-l-2 border-emerald-200 pl-4 text-sm leading-6 text-black/55">{plan.audience.reasoning}</p>
                  <div className="mt-5 flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                    <ShieldCheck size={16} />
                    Genie protected <strong>{plan.audience.protectedByFatiguePolicy} high-fatigue shoppers</strong> from this campaign.
                  </div>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-black/40"><Target size={15} /> STRATEGY</div>
                    <h3 className="mt-4 font-semibold">{plan.strategy.summary}</h3>
                    <p className="mt-2 text-xs leading-5 text-black/50">{plan.strategy.reasoning}</p>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center gap-2 text-xs font-medium text-black/40"><MessageCircle size={15} /> CHANNEL</div>
                    <h3 className="mt-4 font-semibold capitalize">{plan.channel.value.toLowerCase()}</h3>
                    <p className="mt-2 text-xs leading-5 text-black/50">{plan.channel.reasoning}</p>
                  </Card>
                </div>

                <Card className="overflow-hidden">
                  <div className="border-b border-black/[0.05] px-5 py-4 text-xs font-medium text-black/40">MESSAGE PREVIEW</div>
                  <div className="p-6">
                    <div className="max-w-lg rounded-2xl rounded-tl-sm bg-[#eeeafb] px-4 py-3 text-sm leading-6 text-black/75">{plan.message.body}</div>
                    <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-black/45"><Bot size={15} className="mt-0.5 shrink-0 text-violet" /> {plan.message.reasoning}</p>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <Card className="p-6">
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-black/35">Expected outcome</p>
                  <div className="mt-6 space-y-5">
                    {[
                      ["Open rate", plan.expectedOutcome.openRate],
                      ["Click rate", plan.expectedOutcome.clickRate],
                      ["Conversion", plan.expectedOutcome.conversionRate],
                    ].map(([label, range]) => (
                      <div key={String(label)}>
                        <div className="mb-2 flex justify-between text-xs"><span className="text-black/45">{String(label)}</span><strong>{Math.round((range as number[])[0]! * 100)}-{Math.round((range as number[])[1]! * 100)}%</strong></div>
                        <div className="h-1.5 rounded-full bg-black/[0.05]"><div className="h-full rounded-full bg-violet" style={{ width: `${(range as number[])[1]! * 100}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-2xl bg-ink p-4 text-white">
                    <div className="flex items-center gap-2 text-xs text-white/50"><CircleDollarSign size={15} /> Projected revenue</div>
                    <p className="mt-2 text-2xl font-semibold">{money(plan.expectedOutcome.revenue[0])} - {money(plan.expectedOutcome.revenue[1])}</p>
                  </div>
                </Card>
                <Card className="p-5">
                  <p className="text-xs text-black/40">Genie’s next move</p>
                  <p className="mt-2 text-sm leading-6 text-black/65">{plan.followUp}</p>
                </Card>
                <div className="rounded-2xl bg-[#e8e4ff] p-5">
                  {launched ? (
                    <div>
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-white text-emerald-600"><Check size={18} /></div>
                      <h3 className="mt-4 font-semibold">Campaign is live</h3>
                      <p className="mt-1 text-xs leading-5 text-black/55">{launched} communications entered the simulator. Analytics will update as events arrive.</p>
                    </div>
                  ) : campaignId ? (
                    <button onClick={() => launchMutation.mutate(campaignId)} disabled={launchMutation.isPending} className="flex w-full items-center justify-between rounded-xl bg-ink px-4 py-3.5 text-sm font-medium text-white">
                      {launchMutation.isPending ? "Launching..." : "Launch campaign"} <Send size={15} />
                    </button>
                  ) : (
                    <button onClick={() => approveMutation.mutate(plan.planId)} disabled={approveMutation.isPending} className="flex w-full items-center justify-between rounded-xl bg-ink px-4 py-3.5 text-sm font-medium text-white">
                      {approveMutation.isPending ? "Approving..." : "Approve recommendation"} <ChevronRight size={16} />
                    </button>
                  )}
                  {(approveMutation.isError || launchMutation.isError) && <p className="mt-3 text-xs text-rose-700">{(approveMutation.error ?? launchMutation.error)?.message}</p>}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

