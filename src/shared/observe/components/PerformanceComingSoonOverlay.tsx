import type { LucideIcon } from "lucide-react";
import { Sparkles, Clock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PerformanceComingSoonOverlayProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  features?: string[];
}

export function PerformanceComingSoonOverlay({
  title,
  description = "Our high-throughput performance telemetry and real-time profiling engine is currently being provisioned. This capability will be available soon.",
  icon: Icon = Sparkles,
  features = [
    "Real-time Sub-millisecond Percentiles",
    "Zero-overhead Sampling Pipeline",
    "V8 & Node.js Internals Telemetry",
    "AI Automated Latency Diagnosis",
  ],
}: PerformanceComingSoonOverlayProps) {
  return (
    <div className="relative min-h-[520px] w-full flex-1 rounded-[16px] border border-[var(--border)] bg-[var(--bg1)]/80 backdrop-blur-xl p-8 sm:p-12 flex flex-col items-center justify-center text-center overflow-hidden shadow-2xl">
      {/* Background Gradient Spotlights */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[radial-gradient(ellipse_at_center,_var(--brand)_0%,_transparent_70%)] opacity-20 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_center,_#8B5CF6_0%,_transparent_70%)] opacity-15 blur-[90px]" />

      {/* Subtle Background Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 max-w-xl flex flex-col items-center gap-6">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand)]/30 bg-[var(--brand-bg)]/60 px-3.5 py-1 text-xs font-semibold tracking-wide text-[var(--brand)] shadow-sm backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand)]" />
          </span>
          FEATURE COMING SOON
        </div>

        {/* Glowing Icon Badge */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/90 shadow-xl backdrop-blur-md group transition-transform duration-300 hover:scale-105">
          <div className="absolute inset-0 rounded-2xl bg-[var(--brand)]/10 blur-md" />
          <Icon className="h-10 w-10 text-[var(--brand)] transition-colors duration-300" />
        </div>

        {/* Title & Description */}
        <div className="space-y-2.5">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)]">
            {title} is Coming Soon
          </h2>
          <p className="text-sm sm:text-base text-[var(--text2)] leading-relaxed max-w-md mx-auto">
            {description}
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-2 text-left">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)]/50 px-3 py-2 text-xs font-medium text-[var(--text2)] transition-colors hover:border-[var(--brand)]/40 hover:bg-[var(--bg2)]"
            >
              <Zap className="h-3.5 w-3.5 text-[var(--brand)] shrink-0" />
              <span className="truncate">{feat}</span>
            </div>
          ))}
        </div>

        {/* Timeline Note */}
        <div className="flex items-center gap-2 pt-2 text-xs text-[var(--text3)]">
          <Clock className="h-3.5 w-3.5" />
          <span>Scheduled for rollout in upcoming early access release</span>
        </div>
      </div>
    </div>
  );
}
