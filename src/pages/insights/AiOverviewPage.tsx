import { useNavigate } from "react-router";
import { BrainCircuit, ScanEye, GitCommit, CreditCard, MessageSquareWarning, Sparkles } from "lucide-react";
import { PageHeader, KpiCard, SectionCard } from "@/shared/observe";

const FEATURES = [
  { icon: BrainCircuit, title: "Root Cause Analysis", desc: "Automated incident explanation with confidence scoring.", to: "/ai/root-cause" },
  { icon: ScanEye, title: "Anomaly Detection", desc: "AI-driven anomaly summaries across services.", to: "/ai/anomalies" },
  { icon: GitCommit, title: "Release Impact", desc: "Release-aware regression insights.", to: "/ai/release-impact" },
  { icon: CreditCard, title: "Cost & Usage", desc: "Model spend tracking and governance.", to: "/ai/costs" },
  { icon: MessageSquareWarning, title: "Prompt & Policy", desc: "Prompt governance and approval controls.", to: "/ai/policies" },
];

export default function AiOverviewPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="AI Overview" description="AI-assisted triage, anomaly detection, and root cause analysis." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Insights generated" value="1,284" icon={Sparkles} trend="up" delta="+18%" />
        <KpiCard label="RCA reports" value="42" />
        <KpiCard label="Anomalies flagged" value="15" />
        <KpiCard label="Avg confidence" value="86%" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} role="button" tabIndex={0} onClick={() => navigate(f.to)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(f.to); } }} className="cursor-pointer rounded-[12px] border border-[var(--border)] bg-[var(--bg1)] p-5 transition-colors hover:border-[var(--input)]">
            <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--brand-bg)]"><f.icon className="size-5 text-[var(--brand)]" /></div>
            <div className="mt-3 font-semibold text-[var(--text)]">{f.title}</div>
            <p className="mt-1 text-[13px] text-[var(--text2)]">{f.desc}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Latest AI insight">
        <p className="text-[13px] text-[var(--text2)]">
          <span className="font-medium text-[var(--text)]">Payment API error spike likely caused by release v2.1.0.</span> The model correlated a 240% increase in <code className="font-[family-name:var(--mono)] text-[var(--brand)]">PrismaClientKnownRequestError</code> with the deploy timestamp. Confidence: 91%.
        </p>
      </SectionCard>
    </div>
  );
}
