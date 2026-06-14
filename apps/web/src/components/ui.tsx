import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,.02)]", className)} {...props} />;
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "violet" | "amber" }) {
  const tones = {
    neutral: "bg-black/[0.05] text-black/55",
    green: "bg-emerald-50 text-emerald-700",
    violet: "bg-violet/10 text-violet",
    amber: "bg-amber-50 text-amber-700",
  };
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

export function Loading() {
  return <div className="grid min-h-[420px] place-items-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-black/10 border-t-violet" /></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <Card className="m-8 p-8 text-sm text-rose-700">Could not load Xeno Genie: {message}. Confirm PostgreSQL, the seed, and CRM API are running.</Card>;
}

