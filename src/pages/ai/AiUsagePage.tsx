import {
  Activity,
  CreditCard,
  DatabaseZap,
  Gauge,
  LineChart,
  ListOrdered,
  Send,
  Coins,
} from "lucide-react";
import { PageHero, Panel, Meter, StatCard, EmptyPanel, Notice, SectionHeading } from "@/shared/ui/pulse";
import { formatNumber, formatCompact } from "@/shared/observe";
import { AiErrorState, AiLoadingBlock } from "@/modules/ai/components/states";
import { useAiCreditUsage } from "@/modules/ai/hooks/useAi";

// These analytics dimensions are not exposed by the current usage API. Rather
// than fabricate values, each renders an explicit "not available" surface.
const UNAVAILABLE_METRICS = [
  { icon: Send, label: "Requests", hint: "Per-feature request counts" },
  { icon: Coins, label: "Token usage", hint: "Prompt + completion tokens" },
  { icon: LineChart, label: "Cost", hint: "Spend attributed to AI" },
  { icon: DatabaseZap, label: "Cache hits", hint: "Answers served from cache" },
];

export default function AiUsagePage() {
  const usage = useAiCreditUsage();
  const credit = usage.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        eyebrow="Artificial Intelligence"
        title="AI Usage"
        description="Track AI credit consumption for your organization. Credits are shared across the Assistant, investigations, and reports."
        icon={Gauge}
      />

      {/* Credits — real data from the billing usage surface */}
      {usage.isLoading ? (
        <AiLoadingBlock rows={1} />
      ) : usage.isError ? (
        <AiErrorState error={usage.error} onRetry={() => usage.refetch()} />
      ) : credit ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Credits remaining" value={formatNumber(credit.remaining)} icon={CreditCard} tone="ai" />
            <StatCard label="Credits used" value={formatNumber(credit.used)} icon={Gauge} tone="brand" />
            <StatCard
              label="Monthly allowance"
              value={credit.limit > 0 ? formatNumber(credit.limit) : "∞"}
              icon={Coins}
              tone="violet"
            />
          </div>

          <Panel title="Credit consumption" icon={Gauge} tone="ai">
            <Meter
              label="AI credits this cycle"
              used={credit.used}
              limit={credit.limit > 0 ? credit.limit : null}
              format={formatCompact}
              hint={
                credit.limit > 0
                  ? `${formatNumber(credit.remaining)} credits remaining this cycle`
                  : "Unlimited credits on this plan"
              }
            />
          </Panel>
        </>
      ) : (
        <EmptyPanel icon={Gauge} title="No usage data" description="Credit usage isn't available yet." />
      )}

      {/* Detailed analytics — surfaced honestly as not-yet-available */}
      <SectionHeading
        title="Detailed analytics"
        description="Per-feature requests, tokens, cost, and cache performance."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {UNAVAILABLE_METRICS.map((m) => (
          <div
            key={m.label}
            className="flex flex-col gap-2 rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--bg1)] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text3)]">
                {m.label}
              </span>
              <m.icon className="size-4 text-[var(--text3)]" />
            </div>
            <span className="font-[family-name:var(--display)] text-[22px] font-semibold text-[var(--text3)]">—</span>
            <span className="text-[11.5px] text-[var(--text3)]">{m.hint}</span>
          </div>
        ))}
      </div>

      <Notice icon={Activity} tone="neutral" title="Detailed usage analytics not available">
        Per-feature request counts, token usage, cost attribution, and cache-hit rates require the AI usage
        analytics API, which isn't enabled in this environment. Credit consumption above reflects live billing
        data.
      </Notice>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Top features" icon={ListOrdered}>
          <EmptyPanel
            icon={ListOrdered}
            title="No feature breakdown"
            description="Feature-level usage will appear here once the analytics API is available."
          />
        </Panel>
        <Panel title="Recent usage" icon={Activity}>
          <EmptyPanel
            icon={Activity}
            title="No recent usage events"
            description="A timeline of AI requests will appear here once the analytics API is available."
          />
        </Panel>
      </div>
    </div>
  );
}
