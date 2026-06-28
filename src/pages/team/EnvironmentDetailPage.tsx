import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useEnvironment } from "@/hooks/useDummyData";
import { PageHeader, SectionCard, KpiCard, Button, formatCompact, demoSuccess } from "@/shared/observe";
import { cn } from "@/lib/utils";

export default function EnvironmentDetailPage() {
  const { envId = "" } = useParams();
  const navigate = useNavigate();
  const { data: e, isLoading } = useEnvironment(envId);

  if (isLoading) return <div className="p-8 text-[var(--text3)]">Loading environment…</div>;
  if (!e) return <div className="p-8 text-[var(--text2)]">Environment not found.</div>;

  const settings = [
    { key: "captureHeaders", label: "Capture headers", on: e.settings.captureHeaders },
    { key: "captureBody", label: "Capture request body", on: e.settings.captureBody },
    { key: "captureCookies", label: "Capture cookies", on: e.settings.captureCookies },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" onClick={() => navigate(-1)}><ArrowLeft className="size-4" /> Back to environments</Button>
      <PageHeader
        title={e.name}
        breadcrumbs={[{ label: "Team" }, { label: "Environments" }, { label: e.name }]}
        actions={<span className="flex items-center gap-2 text-[13px] text-[var(--text2)]"><span className="size-3 rounded-full" style={{ background: e.color }} /> {e.slug}</span>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Projects" value={e.projectCount} />
        <KpiCard label="Events / 24h" value={formatCompact(e.eventVolume24h)} />
        <KpiCard label="Retention" value={`${e.retentionDays} days`} />
        <KpiCard label="Max span attrs" value={e.settings.maxSpanAttributes} />
      </div>

      <SectionCard title="Capture settings">
        <div className="flex flex-col gap-3">
          {settings.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--text)]">{s.label}</span>
              <button
                onClick={() => demoSuccess(`${s.label} toggled`)}
                className={cn("relative h-5 w-9 rounded-full transition-colors", s.on ? "bg-[var(--brand)]" : "bg-[var(--bg3)]")}
              >
                <span className={cn("absolute top-0.5 size-4 rounded-full bg-white transition-transform", s.on ? "translate-x-4" : "translate-x-0.5")} />
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
