import { useNavigate } from "react-router";
import { BrainCircuit, ScanEye, GitCommit, CreditCard, MessageSquareWarning, Sparkles } from "lucide-react";
import { PageHeader, KpiCard } from "@/shared/observe";
import { AiInsightCard } from "@/shared/ui/sentinel";

const FEATURES = [
  { icon: BrainCircuit, title: "Root cause analysis", desc: "Automated incident explanation with confidence scoring.", to: "/ai/root-cause" },
  { icon: ScanEye, title: "Anomaly detection", desc: "Model-detected anomaly summaries across services.", to: "/ai/anomalies" },
  { icon: GitCommit, title: "Release impact", desc: "Release-aware regression insights.", to: "/ai/release-impact" },
  { icon: CreditCard, title: "Cost and usage", desc: "Model spend tracking and governance.", to: "/ai/costs" },
  { icon: MessageSquareWarning, title: "Prompt and policy", desc: "Prompt governance and approval controls.", to: "/ai/policies" },
];

export default function AiOverviewPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="AI overview" description="AI-assisted triage, anomaly detection, and root cause analysis." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Insights generated" value="1,284" icon={Sparkles} trend="up" delta="+18%" />
        <KpiCard label="RCA reports" value="42" />
        <KpiCard label="Anomalies flagged" value="15" />
        <KpiCard label="Avg confidence" value="86%" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} role="button" tabIndex={0} onClick={() => navigate(f.to)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(f.to); } }} className="cursor-pointer rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg1)] p-5 transition-colors duration-150 hover:border-[var(--border2)]">
            {/* AI surfaces speak in the AI channel (§2.4) */}
            <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--ai-bg)]"><f.icon className="size-5 text-[var(--ai)]" /></div>
            <div className="mt-3 text-[14px] font-semibold text-[var(--text)]">{f.title}</div>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text2)]">{f.desc}</p>
          </div>
        ))}
      </div>

      <AiInsightCard
        title="Payment API error spike correlates with release v2.1.0"
        confidence={91}
      >
        The model correlated a 240% increase in{' '}
        <code className="font-[family-name:var(--mono)] text-[var(--ai)]">PrismaClientKnownRequestError</code>{' '}
        with the deploy timestamp.
      </AiInsightCard>
    </div>
  );
}
